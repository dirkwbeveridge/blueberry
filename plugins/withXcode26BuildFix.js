const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Fixes Xcode 26 beta's stricter build-script sandboxing, which breaks CocoaPods
 * resource-copy scripts in two ways:
 *
 *  1. ENABLE_USER_SCRIPT_SANDBOXING=YES prevents rsync from writing into the app
 *     bundle and blocks writes to PODS_ROOT — set it to NO.
 *  2. CocoaPods-generated *-resources.sh scripts use `realpath -mq` (GNU-only) and
 *     write a temp manifest to ${PODS_ROOT} (sandboxed) — patch both via post_install.
 */

const withDisableScriptSandboxing = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(configurations)) {
      const bc = configurations[key];
      if (bc && typeof bc === 'object' && bc.buildSettings) {
        bc.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }

    return cfg;
  });

const withPodfileXcode26Fix = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const marker = '# [xcode26-build-fix] applied';
      if (contents.includes(marker)) return cfg;

      const hook = `
  # ${marker}
  # Xcode 26 sandbox: move rsync temp manifest out of PODS_ROOT and fix GNU realpath flag.
  Dir.glob(File.join(installer.sandbox.root, "Target Support Files", "**", "*-resources.sh")).each do |script|
    content = File.read(script)
    modified = content
      .gsub(/\\$\\{PODS_ROOT\\}\\/resources-to-copy-/, '${TMPDIR}/resources-to-copy-')
      .gsub('$(realpath -mq "\${0}")', '$(cd "$(dirname "$0")"; pwd)/$(basename "$0")')
      .gsub('rsync -avr --copy-links --no-relative --exclude', 'rsync -avr --copy-links --no-relative --inplace --exclude')
    File.write(script, modified) if modified != content
  end
`;

      contents = contents.replace(
        /(\s*post_install do \|installer\|)/,
        `$1\n${hook}`
      );

      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);

module.exports = (config) => {
  config = withDisableScriptSandboxing(config);
  config = withPodfileXcode26Fix(config);
  return config;
};
