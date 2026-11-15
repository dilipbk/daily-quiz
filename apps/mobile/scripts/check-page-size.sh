#!/usr/bin/env bash
# Checks an APK against Android's 16 KB page-size requirement (Google Play enforces it for
# updates from 2027-02-01). Two checks, both from developer.android.com/guide/practices/page-sizes:
#   1. the APK is zip-aligned for 16 KB pages;
#   2. every 64-bit shared library's LOAD segments are aligned to 2**14 or more.
# Usage: scripts/check-page-size.sh path/to/app.apk
set -euo pipefail

apk="${1:?usage: check-page-size.sh path/to/app.apk}"
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
zipalign="$(ls -d "$sdk"/build-tools/*/zipalign | sort -V | tail -1)"
objdump="$(ls -d "$sdk"/ndk/*/toolchains/llvm/prebuilt/*/bin/llvm-objdump | sort -V | tail -1)"

echo "APK: $apk"
echo "zipalign: $zipalign"
echo "llvm-objdump: $objdump"

echo
echo "== 1. zipalign -c -P 16 -v 4 =="
if "$zipalign" -c -P 16 -v 4 "$apk" > /tmp/zipalign.$$ 2>&1; then
  grep -c '(OK' /tmp/zipalign.$$ | sed 's/$/ entries OK/'
  grep -E '\(BAD|Verification' /tmp/zipalign.$$ || true
else
  grep -E '\(BAD|Verification|rror' /tmp/zipalign.$$ || cat /tmp/zipalign.$$
  rm -f /tmp/zipalign.$$
  echo "FAIL: the APK is not zip-aligned for 16 KB pages"
  exit 1
fi
rm -f /tmp/zipalign.$$

echo
echo "== 2. LOAD segment alignment of 64-bit libraries =="
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
unzip -q -o "$apk" 'lib/arm64-v8a/*' 'lib/x86_64/*' -d "$work" 2> /dev/null || true

failed=0
total=0
while IFS= read -r lib; do
  total=$((total + 1))
  # The smallest alignment among the library's LOAD segments, as a power of two.
  min="$("$objdump" -p "$lib" | awk '/LOAD/ { sub(/.*align 2\*\*/, ""); print $1 }' | sort -n | head -1)"
  name="${lib#"$work"/lib/}"
  if [ "${min:-0}" -ge 14 ]; then
    printf 'ALIGNED    2**%-2s  %s\n' "$min" "$name"
  else
    printf 'UNALIGNED  2**%-2s  %s\n' "${min:-?}" "$name"
    failed=$((failed + 1))
  fi
done < <(find "$work/lib" -name '*.so' | sort)

echo
if [ "$total" -eq 0 ]; then
  echo "FAIL: no 64-bit libraries found in the APK"
  exit 1
fi
if [ "$failed" -gt 0 ]; then
  echo "FAIL: $failed of $total libraries are not 16 KB aligned"
  exit 1
fi
echo "PASS: all $total 64-bit libraries are 16 KB aligned, and the APK is zip-aligned for 16 KB pages"
