import { useEffect, useState } from "react";
import {
  isTopPicksActive,
  subscribeToTopPicksActivity,
} from "../lib/topPicksActivity";

export function useTopPicksActivity() {
  const [active, setActive] = useState(isTopPicksActive);
  useEffect(() => {
    const update = () => setActive(isTopPicksActive());
    const stop = subscribeToTopPicksActivity(update);
    update();
    return stop;
  }, []);
  return active;
}
