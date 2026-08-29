import { Dialog } from "@kobalte/core/dialog";
import type { Role } from "@mafia/shared";
import { t } from "../i18n";

const ROLE_ICON: Record<Role, string> = {
  mafia: "🔪",
  doctor: "💉",
  sheriff: "🕵️",
  civilian: "🙂",
};

export function RoleReveal(props: { role: Role; open: boolean; onDismiss: () => void }) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onDismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog-overlay" />
        <div class="dialog-positioner">
          <Dialog.Content class="card dialog-content">
            <Dialog.Title>
              <h2>
                {ROLE_ICON[props.role]} {t("role.heading")}: {t(`role.${props.role}`)}
              </h2>
            </Dialog.Title>
            <Dialog.Description>
              <p>{t(`role.${props.role}Desc`)}</p>
            </Dialog.Description>
            <Dialog.CloseButton as="button" class="primary" onClick={props.onDismiss}>
              {t("role.dismiss")}
            </Dialog.CloseButton>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
