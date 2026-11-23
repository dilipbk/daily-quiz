// Unistyles must be configured before any route module creates a stylesheet,
// so it is imported ahead of Expo Router's entry.
import './src/unistyles';
import 'expo-router/entry';
