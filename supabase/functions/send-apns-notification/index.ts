import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';

type ApnsRequest = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  bundleId?: string;
  environment?: 'sandbox' | 'production';
};

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

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const defaultBundleId = Deno.env.get('APNS_BUNDLE_ID');
    const defaultEnvironment = Deno.env.get('APNS_ENV') ?? 'sandbox';
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
    return Response.json(
      { error: message },
      { status: message === 'Missing APNs credentials' ? 500 : 400 }
    );
  }

  return Response.json({ ok: true });
});
