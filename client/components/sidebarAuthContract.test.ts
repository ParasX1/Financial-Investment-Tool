import fs from "fs";
import path from "path";

describe("Sidebar authentication entry contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components", "sidebar.tsx"),
    "utf8",
  );

  it("opens the shared account dialog for locked app routes", () => {
    expect(source).toContain(
      'import { AuthDialog, useAuthDialog } from "@/features/auth";',
    );
    expect(source).toContain(
      "onLockedSelect={() => authDialog.openSignIn(item.href)}",
    );
    expect(source).toContain(
      "<AuthDialog {...authDialog.dialogProps} onHide={authDialog.close} />",
    );
  });

  it("does not restore the old login-only modal path", () => {
    expect(source).not.toContain("ModalLogin");
    expect(source).not.toContain("showLogin");
  });
});
