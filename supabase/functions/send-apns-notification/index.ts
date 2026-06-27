import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';

type ApnsRequest = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  bundleId?: string;
  environment?: 'sandbox' | 'production';
};

function getRequiredPushSecret() {
  const secret = Deno.env.get('PUSH_FUNCTION_SECRET');
  if (!secret || secret.trim().length === 0) {
    throw new Error('Missing PUSH_FUNCTION_SECRET');
  }

  return secret;
}

function assertAuthorized(request: Request) {
  const configuredSecret = getRequiredPushSecret();
  const providedSecret = request.headers.get('x-push-function-secret');

  if (!providedSecret || providedSecret !== configuredSecret) {
    throw new Error('Unauthorized');
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseApnsRequest(value: unknown): ApnsRequest {
  if (!isPlainObject(value)) {
    throw new Error('Request body must be a JSON object');
  }

  const { token, title, body, data, bundleId, environment } = value;

  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('token is required');
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('title is required');
  }

  if (typeof body !== 'string' || body.trim().length === 0) {
    throw new Error('body is required');
  }

  if (data !== undefined && !isPlainObject(data)) {
    throw new Error('data must be a JSON object');
  }

  if (bundleId !== undefined && (typeof bundleId !== 'string' || bundleId.trim().length === 0)) {
    throw new Error('bundleId must be a non-empty string');
  }

  if (environment !== undefined && environment !== 'sandbox' && environment !== 'production') {
    throw new Error("environment must be 'sandbox' or 'production'");
  }

  return {
    token: token.trim(),
    title: title.trim(),
    body: body.trim(),
    data,
    bundleId: bundleId?.trim(),
    environment,
  };
}

async function createApnsJwt() {
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const privateKey = Deno.env.get('APNS_PRIVATE_KEY');

  if (!teamId || !keyId || !privateKey) {
    throw new Error('Missing APNs credentials');
  }

  const key = await importPKCS8(privateKey.replaceAll('\\n', '\n'), 'ES256');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(key);
}

function resolveApnsEnvironment(value: string | undefined) {
  if (!value) {
    return 'sandbox' as const;
  }

  if (value !== 'sandbox' && value !== 'production') {
    throw new Error("APNS_ENV must be 'sandbox' or 'production'");
  }

  return value;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    assertAuthorized(request);

    const defaultBundleId = Deno.env.get('APNS_BUNDLE_ID');
    const defaultEnvironment = resolveApnsEnvironment(Deno.env.get('APNS_ENV'));
    const body = parseApnsRequest(await request.json());
    const bundleId = body.bundleId ?? defaultBundleId;
    const apnsEnvironment = body.environment ?? defaultEnvironment;

    if (!bundleId) {
      return Response.json({ error: 'Missing APNS_BUNDLE_ID' }, { status: 500 });
    }

    const jwt = await createApnsJwt();
    const host = apnsEnvironment === 'production' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
    const apnsResponse = await fetch(`https://${host}/3/device/${body.token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        aps: {
          alert: {
            title: body.title,
            body: body.body,
          },
          sound: 'default',
        },
        data: body.data ?? {},
      }),
    });

    if (!apnsResponse.ok) {
      return Response.json(
        {
          error: 'APNs request failed',
          status: apnsResponse.status,
          details: await apnsResponse.text(),
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid APNs request';
    if (message === 'Unauthorized') {
      return Response.json({ error: message }, { status: 401 });
    }

    return Response.json(
      { error: message },
      {
        status:
          message === 'Missing APNs credentials' ||
          message === 'Missing APNS_BUNDLE_ID' ||
          message === 'Missing PUSH_FUNCTION_SECRET'
            ? 500
            : 400,
      }
    );
  }

  return Response.json({ ok: true });
});
