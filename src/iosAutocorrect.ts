import { NativeModules, Platform } from 'react-native';

type UITextCheckerModuleType = {
  autocorrect: (text: string) => Promise<string>;
};

const uiTextCheckerModule = NativeModules.UITextCheckerModule as UITextCheckerModuleType | undefined;

export async function autoCorrectWithUITextChecker(input: string): Promise<string | null> {
  if (Platform.OS !== 'ios' || !uiTextCheckerModule?.autocorrect) {
    return null;
  }

  const corrected = await uiTextCheckerModule.autocorrect(input);
  return corrected?.trim() ? corrected : null;
}
