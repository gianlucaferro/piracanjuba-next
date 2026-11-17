"use client";

import * as React from "react";

import { deveTrocarAbaNoCliente } from "@/lib/abas-orgaos";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside <Tabs>");
  }
  return context;
}

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
};

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  ...props
}: TabsProps) {
  const baseId = React.useId();
  const [internalValue, setInternalValue] = React.useState(defaultValue || value || "");
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue, baseId }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

// Com href, a aba vira <a role="tab">: o robô de busca segue o link e o visitante pode
// abrir a aba em nova guia. O clique simples continua trocando a aba na hora, sem navegar.
type TabsTriggerLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  value: string;
  href: string;
};

type TabsTriggerProps = TabsTriggerButtonProps | TabsTriggerLinkProps;

const tabsTriggerClassName =
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

function TabsTrigger(allProps: TabsTriggerProps) {
  const tabs = useTabs();
  const active = tabs.value === allProps.value;
  const triggerId = `${tabs.baseId}-trigger-${allProps.value}`;
  const contentId = `${tabs.baseId}-content-${allProps.value}`;

  if ("href" in allProps) {
    const { className, value, href, onClick, onKeyDown, target, ...props } = allProps;
    return (
      <a
        href={href}
        target={target}
        data-slot="tabs-trigger"
        data-state={active ? "active" : "inactive"}
        data-active={active ? "" : undefined}
        role="tab"
        id={triggerId}
        aria-controls={contentId}
        aria-selected={active}
        className={cn(tabsTriggerClassName, className)}
        onClick={(event) => {
          onClick?.(event);
          if (!deveTrocarAbaNoCliente(event, target)) return;
          event.preventDefault();
          tabs.setValue(value);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // Link só responde ao Enter; a aba (como o botão de antes) responde também ao Espaço.
          if (event.defaultPrevented || event.key !== " ") return;
          event.preventDefault();
          tabs.setValue(value);
        }}
        {...props}
      />
    );
  }

  const { className, value, onClick, disabled, ...props } = allProps;
  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      data-state={active ? "active" : "inactive"}
      data-active={active ? "" : undefined}
      role="tab"
      id={triggerId}
      aria-controls={contentId}
      aria-selected={active}
      disabled={disabled}
      className={cn(tabsTriggerClassName, className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          tabs.setValue(value);
        }
      }}
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  forceMount?: boolean;
};

function TabsContent({ className, value, forceMount, ...props }: TabsContentProps) {
  const tabs = useTabs();
  const active = tabs.value === value;
  const triggerId = `${tabs.baseId}-trigger-${value}`;
  const contentId = `${tabs.baseId}-content-${value}`;

  if (!forceMount && !active) return null;

  return (
    <div
      data-slot="tabs-content"
      data-state={active ? "active" : "inactive"}
      data-active={active ? "" : undefined}
      role="tabpanel"
      id={contentId}
      aria-labelledby={triggerId}
      hidden={!active}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
