# Domain Ubiquitous Language

Use these optional templates to document a target project's bounded contexts,
aggregate vocabulary and domain events. The package contains authoring guidance,
not the source repository's domain facts or a required target directory.

## Sources and ownership

Use the target's requirements, accepted decisions, specifications, code, event/API
contracts and domain-expert statements. Attribute observations and proposals;
unconfirmed terminology stays unresolved. A relationship does not establish
bounded-context or aggregate ownership. Resolve a missing ownership decision
before using it to classify a document.

Keep business vocabulary separate from technical glossaries. Define synonyms,
ambiguous terms and names to avoid. A rename affecting APIs, DTOs, events,
database schemas or messages needs the target's semantic/compatibility decision.
The language and storage location are selected by the target project.

## Templates

- [Bounded context language](templates/bounded-context-language-template.md)
- [Aggregate vocabulary](templates/aggregate-vocabulary-template.md)
- [Domain event language](templates/domain-event-language-template.md)

For example, a project may choose `docs/domain-language/<context-id>.md` and
`docs/domain-language/<context-id>/<aggregate-id>.md`. Requirements, behavior
specifications and operational facts retain their separate owners and locations.
Do not copy completed records from another project or create a terminology skill
or a new record solely to use a template.
