# Offline Dependency Cache

This folder holds every OS/runtime dependency that the installer needs when the target VM has no internet access.

Included artifacts:

- APT debs: nginx, postgresql-16, postgresql-client-16, postgresql-common, postgresql-client-common, postgresql-contrib, libpq5, fail2ban, python3-pyasyncore, python3-pyinotify, whois, ssl-cert, perl stack (libperl5.38/perl/perl-base/perl-modules), libjson-perl/json-xs, libcommon-sense-perl, libtypes-serialiser-perl, libllvm17t64.
- Runtime bundles: `node-v20.17.0-linux-x64.tar.xz` (extract to `/usr/local/lib/nodejs`) and `pm2-*.tgz` (install with `npm install -g ./deps/pm2-*.tgz`).

To refresh this cache on a machine with internet access, run:

```bash
cd /home/subhash.thakur.india/Projects/hptourism-rc3
scripts/fetch-deps.sh
```

The script downloads the latest binaries into `deps/` so `Installation/setup.sh` can run completely offline.
