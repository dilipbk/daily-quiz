import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { useServerUnistyles } from 'react-native-unistyles/server';

// Web only. The server renders this document, so Unistyles has to be configured here too,
// and its styles emitted after the page content.
import '../unistyles';

// With `web.output: "server"` on SDK 58, Expo Router hands the stylesheet, the script tags
// and the fonts to the root document through this context. A custom root that doesn't
// render `headNodes` and `bodyNodes` serves a page that never loads its JavaScript.
export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, headNodes, htmlAttributes } = useServerDocumentContext();
  const unistyles = useServerUnistyles({ includeRNWStyles: false });

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {unistyles}
        {bodyNodes}
      </body>
    </html>
  );
}
