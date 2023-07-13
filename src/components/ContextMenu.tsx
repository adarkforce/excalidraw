import { Popover } from "./Popover";
import { t } from "../i18n";

import "./ContextMenu.scss";
import {
  getShortcutFromShortcutName,
  ShortcutName,
} from "../actions/shortcuts";
import { Action } from "../actions/types";
import { ActionManager } from "../actions/manager";
import {
  useExcalidrawAppState,
  useExcalidrawElements,
  useExcalidrawSetAppState,
} from "./App";
import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { isTestEnv } from "../utils";

// From https://github.com/radix-ui/icons
const ChevronRightIcon = React.forwardRef<SVGSVGElement, any>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
          fill={color}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    );
  },
);

export type ContextMenuItem = typeof CONTEXT_MENU_SEPARATOR | Action;

export type ContextMenuGroup = {
  label: string;
  items: (ContextMenuItem | ContextMenuGroup)[];
  isContextMenuGroup: true;
};

export type ContextMenuItems = (
  | ContextMenuItem
  | ContextMenuGroup
  | false
  | null
  | undefined
)[];

type ContextMenuProps = {
  actionManager: ActionManager;
  items: ContextMenuItems;
  top: number;
  left: number;
};

export const CONTEXT_MENU_SEPARATOR = "separator";

export const createContextMenuGroup = ({
  label,
  items,
}: {
  label: string;
  items: (ContextMenuItem | ContextMenuGroup)[];
}): ContextMenuGroup => {
  return {
    label,
    items,
    isContextMenuGroup: true,
  };
};

const isContextMenuGroup = (item: any): item is ContextMenuGroup => {
  return (
    typeof item.label === "string" &&
    Array.isArray(item.items) &&
    item.isContextMenuGroup === true
  );
};

export const ContextMenu = React.memo(
  ({ actionManager, items, top, left }: ContextMenuProps) => {
    const appState = useExcalidrawAppState();
    const setAppState = useExcalidrawSetAppState();
    const elements = useExcalidrawElements();

    const getActionContextMenuLabel = (item: Action): string => {
      let label = "";
      if (item.contextItemLabel) {
        if (typeof item.contextItemLabel === "function") {
          label = t(item.contextItemLabel(elements, appState));
        } else {
          label = t(item.contextItemLabel);
        }
      }
      return label;
    };

    const itemMustBeShown = (item: any): item is ContextMenuItem => {
      return (
        item &&
        (isContextMenuGroup(item) ||
          item === CONTEXT_MENU_SEPARATOR ||
          item.predicate === undefined ||
          item.predicate(
            elements,
            appState,
            actionManager.app.props,
            actionManager.app,
          ))
      );
    };

    const filterAllItems = (
      itms: ContextMenuItems,
    ): (ContextMenuItem | ContextMenuGroup)[] => {
      const filteredItems: (ContextMenuItem | ContextMenuGroup)[] = [];

      for (const item of itms) {
        if (itemMustBeShown(item)) {
          if (isContextMenuGroup(item)) {
            item.items = filterAllItems(item.items);
            if (item.items.length > 0) {
              filteredItems.push(item);
            }
          } else if (
            item === CONTEXT_MENU_SEPARATOR &&
            filteredItems[filteredItems.length - 1] &&
            item !== filteredItems[filteredItems.length - 1]
          ) {
            filteredItems.push(item);
          } else if (item !== CONTEXT_MENU_SEPARATOR) {
            filteredItems.push(item);
          }
        }
      }

      return filteredItems;
    };

    const filteredItems = filterAllItems(items);

    const renderItem = (
      item: ContextMenuItem | ContextMenuGroup,
      idx: number,
    ) => {
      if (item === CONTEXT_MENU_SEPARATOR) {
        return (
          <DropdownMenu.Separator key={idx} className="DropdownMenuSeparator" />
        );
      }

      if (isContextMenuGroup(item)) {
        const menuItemContent = (
          <React.Fragment>
            {item.label}{" "}
            <div className="RightSlot">
              <ChevronRightIcon />
            </div>
          </React.Fragment>
        );
        return (
          <DropdownMenu.Sub key={idx} open={isTestEnv() || undefined}>
            {/* Always keeping the sub menu open when running tests to make every option easly available */}
            <DropdownMenu.SubTrigger className="DropdownMenuSubTrigger">
              {menuItemContent}
            </DropdownMenu.SubTrigger>
            <Popover
              fitInViewport={true}
              viewportWidth={appState.width}
              viewportHeight={appState.height}
            >
              <DropdownMenu.SubContent className="DropdownMenuSubContent">
                {item.items.map(renderItem)}
              </DropdownMenu.SubContent>
            </Popover>
          </DropdownMenu.Sub>
        );
      }

      const actionName = item.name;
      const label = getActionContextMenuLabel(item as Action);

      return (
        <DropdownMenu.Item
          key={idx}
          data-testid={actionName}
          onClick={() => {
            // we need update state before executing the action in case
            // the action uses the appState it's being passed (that still
            // contains a defined contextMenu) to return the next state.
            setAppState({ contextMenu: null }, () => {
              actionManager.executeAction(item, "contextMenu");
            });
          }}
          className="DropdownMenuItem"
        >
          {label}
          <div className="RightSlot">
            {actionName
              ? getShortcutFromShortcutName(actionName as ShortcutName)
              : null}
          </div>
        </DropdownMenu.Item>
      );
    };

    return (
      <Popover
        onCloseRequest={() => setAppState({ contextMenu: null })}
        top={top}
        left={left}
        fitInViewport={true}
        offsetLeft={appState.offsetLeft}
        offsetTop={appState.offsetTop}
        viewportWidth={appState.width}
        viewportHeight={appState.height}
      >
        <DropdownMenu.Root open={true}>
          <DropdownMenu.Trigger className="DropdownMenuTrigger" />
          <DropdownMenu.Content
            className="DropdownMenuContent"
            align="start"
            onContextMenu={(e) => e.preventDefault()}
            sideOffset={25}
          >
            {filteredItems.map(renderItem)}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Popover>
    );
  },
);
