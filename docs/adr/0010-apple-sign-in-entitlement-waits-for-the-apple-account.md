# 0010. The Sign in with Apple entitlement waits for the Apple Developer account

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-15 |
| **Ticket** | `FND-05` |
| **Requirements** | ONB-04 (sign-in options), roadmap §3.1 (auth on the device) |

## Context

`expo-apple-authentication` ~58.0.3 is a planned library, so the smoke build installs it. During `expo prebuild`, Expo applies the library's config plugin automatically whenever the package is installed, whether or not the app config lists it or sets `ios.usesAppleSignIn`. The plugin adds the entitlement `com.apple.developer.applesignin`.

Expo CLI 58.1.20 refuses to build an app with that entitlement, even for a simulator, unless the Mac has a development signing certificate: `expo run:ios` stops before compiling with "No code signing certificates are available to use." (`@expo/cli/build/src/run/ios/codeSigning/simulatorCodeSigning.js` lists this entitlement and associated domains). A certificate needs the Apple Developer account, which the owner opens under O-2 and FND-04 wires up.

## Decision

Until the Apple Developer account exists, `apps/mobile/app.config.ts` removes the Sign in with Apple entitlement from the generated project with a small config plugin (`withoutAppleSignInEntitlement`). The library stays installed, linked and exercised by the smoke check (`isAvailableAsync`).

The EAS half of FND-05 deletes that plugin and sets `ios.usesAppleSignIn: true`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Leave the library out of the shell | Its native code would go unproven on React Native 0.88, which is the point of the ticket. |
| Build with `xcodebuild` directly, bypassing Expo CLI's check | The team's documented command is `expo run:ios`; a build path only this ticket uses proves less. |
| Report the ticket blocked until a certificate exists | Only one entitlement depends on the account. Everything else builds without it. |

## Consequences

- Local iOS builds need no Apple account for now. Sign in with Apple cannot work in them: the system refuses the request without the entitlement.
- Associated domains (universal links, CHL-02) hit the same Expo CLI rule. The ticket that adds them needs the signing certificate in place first, on every machine that builds for the simulator.
- Once the entitlement is back, anyone building locally for a simulator needs a development certificate from the team's Apple account. The README should say so when the EAS half lands.
