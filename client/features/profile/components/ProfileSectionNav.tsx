import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import { FIT_FOCUS_VISIBLE, cn } from "@/components/shared/uiPrimitives";
import {
  PROFILE_SECTION_NAV_ITEMS,
  type ProfileSectionNavItem,
} from "../data/profileSections";
import type { ProfileSectionId } from "../types";
import styles from "../styles/profile.module.css";

const navIcons: Record<ProfileSectionId, typeof AccountCircleRoundedIcon> = {
  "personal-details": BadgeRoundedIcon,
  "profile-card": AccountCircleRoundedIcon,
  security: SecurityRoundedIcon,
};

export function ProfileSectionNav({
  activeSectionId,
  onSelect,
}: {
  activeSectionId: ProfileSectionId;
  onSelect: (sectionId: ProfileSectionId) => void;
}) {
  return (
    <aside className={styles.sectionNavPanel} aria-label="Profile sections">
      <div className={styles.sectionNavTitle}>
        <ManageAccountsRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        <span>Sections</span>
      </div>
      <nav aria-label="Profile settings sections">
        <div className={styles.sectionNavList}>
          {PROFILE_SECTION_NAV_ITEMS.map((item) => (
            <ProfileSectionButton
              key={item.id}
              active={activeSectionId === item.id}
              item={item}
              onSelect={onSelect}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}

function ProfileSectionButton({
  active,
  item,
  onSelect,
}: {
  active: boolean;
  item: ProfileSectionNavItem;
  onSelect: (sectionId: ProfileSectionId) => void;
}) {
  const Icon = navIcons[item.id];

  return (
    <button
      type="button"
      aria-current={active ? "location" : undefined}
      className={cn(
        styles.sectionButton,
        active ? styles.sectionButtonActive : null,
        FIT_FOCUS_VISIBLE,
      )}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.sectionButtonIcon} aria-hidden="true">
        <Icon sx={{ fontSize: 18 }} />
      </span>
      <span className="min-w-0">
        <span className={styles.sectionButtonLabel}>{item.label}</span>
        <span className={styles.sectionButtonDescription}>
          {item.description}
        </span>
      </span>
    </button>
  );
}
