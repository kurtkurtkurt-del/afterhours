// Web stand-in for expo-notifications: nothing to show or ask for.
export const AndroidImportance = { HIGH: 4 };
export function setNotificationHandler() {}
export async function getPermissionsAsync() {
  return { status: 'undetermined' };
}
export async function requestPermissionsAsync() {
  return { status: 'denied' };
}
export function addNotificationResponseReceivedListener() {
  return { remove() {} };
}
export async function getLastNotificationResponseAsync() {
  return null;
}
