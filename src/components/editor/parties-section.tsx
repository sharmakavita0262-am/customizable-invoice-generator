"use client";

import { InputField, TextAreaField } from "@/components/ui/field";
import { EditorSection } from "./editor-section";
import { useEditor } from "./editor-state";

const PARTIES = [
  { key: "from", title: "From", namePlaceholder: "Your business name", emailPlaceholder: "billing@example.com" },
  { key: "billTo", title: "Bill to", namePlaceholder: "Client or company name", emailPlaceholder: "client@example.com" },
] as const;

export function PartiesSection() {
  const { draft, dispatch, field } = useEditor();

  return (
    <EditorSection step="02" title="Who's involved">
      <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
        {PARTIES.map(({ key, title, namePlaceholder, emailPlaceholder }) => (
          <fieldset key={key} className="min-w-0 space-y-4">
            <legend className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{title}</legend>
            <InputField
              {...field(`${key}.name`)}
              label="Name"
              placeholder={namePlaceholder}
              value={draft[key].name}
              onChange={(event) => dispatch({ type: "setParty", party: key, field: "name", value: event.target.value })}
              autoComplete={key === "from" ? "organization" : "off"}
            />
            <InputField
              {...field(`${key}.email`)}
              type="email"
              label="Email"
              hint="Optional"
              placeholder={emailPlaceholder}
              value={draft[key].email}
              onChange={(event) => dispatch({ type: "setParty", party: key, field: "email", value: event.target.value })}
              autoComplete={key === "from" ? "email" : "off"}
              spellCheck={false}
            />
            <TextAreaField
              {...field(`${key}.address`)}
              label="Address"
              hint="Optional · one line per row"
              placeholder={"Street\nCity, State ZIP\nCountry"}
              value={draft[key].address}
              onChange={(event) =>
                dispatch({ type: "setParty", party: key, field: "address", value: event.target.value })
              }
            />
          </fieldset>
        ))}
      </div>
    </EditorSection>
  );
}
