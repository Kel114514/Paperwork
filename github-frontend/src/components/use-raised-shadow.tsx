// Deprecated: This file is no longer maintained. The shadow when dragging is abandoned

import { animate, MotionValue, useMotionValue } from "framer-motion";
import { useEffect } from "react";

const inactiveShadow = "0px 0px 0px rgba(0,0,0,0.3)";

export function useRaisedShadow(value: MotionValue<number>) {
  const boxShadow = useMotionValue(inactiveShadow);

  useEffect(() => {
    let isActive = false;
    value.onChange((latest) => {
      const wasActive = isActive;
      if (latest !== 0) {
        isActive = true;
        if (isActive !== wasActive) {
          animate(boxShadow, "0px 0px 10px rgba(0,0,0,0.1)");
        }
      } else {
        isActive = false;
        if (isActive !== wasActive) {
          animate(boxShadow, inactiveShadow);
        }
      }
    });
  }, [value, boxShadow]);

  return boxShadow;
}
