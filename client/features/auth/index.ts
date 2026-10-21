export { AuthDialog } from "./components/AuthDialog";
export { AuthProvider, useAuth } from "./context/AuthContext";
export { useAuthDialog } from "./hooks/useAuthDialog";
export { getAuthErrorMessage } from "./lib/authErrors";
export {
  NEW_PASSWORD_HELPER_TEXT,
  validateNewPassword,
} from "./lib/authValidation";
export type { AuthContextValue } from "./context/AuthContext";
export type { AuthMode, SignUpResult } from "./types";
