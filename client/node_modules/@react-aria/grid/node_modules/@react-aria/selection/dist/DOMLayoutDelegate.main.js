
function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "DOMLayoutDelegate", () => $2ac4508142683dcb$export$8f5ed9ff9f511381);
/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */ class $2ac4508142683dcb$export$8f5ed9ff9f511381 {
    getItemRect(key) {
        let container = this.ref.current;
        let item = key != null ? container.querySelector(`[data-key="${CSS.escape(key.toString())}"]`) : null;
        if (!item) return null;
        let containerRect = container.getBoundingClientRect();
        let itemRect = item.getBoundingClientRect();
        return {
            x: itemRect.left - containerRect.left + container.scrollLeft,
            y: itemRect.top - containerRect.top + container.scrollTop,
            width: itemRect.width,
            height: itemRect.height
        };
    }
    getContentSize() {
        let container = this.ref.current;
        return {
            width: container.scrollWidth,
            height: container.scrollHeight
        };
    }
    getVisibleRect() {
        let container = this.ref.current;
        return {
            x: container.scrollLeft,
            y: container.scrollTop,
            width: container.offsetWidth,
            height: container.offsetHeight
        };
    }
    constructor(ref){
        this.ref = ref;
    }
}


//# sourceMappingURL=DOMLayoutDelegate.main.js.map
