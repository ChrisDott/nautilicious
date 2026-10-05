<!-- naut:start -->
# Naut

An Astro-native CMS. A **Type** is one `.astro` component plus the schema it exports. Props are
derived from that schema, so there is no wiring step and no second place to edit.

**After changing a schema, run `naut check`. After changing markup, run the `typecheck` script.**

The first reports what Astro accepted and quietly did nothing about, which nothing else in the
toolchain sees and an Editor is the one who finds. The second is `astro check`, which `init`
installs, and it is the only thing here that reads a template.

## 1. The shape

A Type is one file at `src/components/<Name>.astro`. The Type name is the file name in lower camel,
so `ServicePage.astro` is `servicePage`, `SEOBlock.astro` is `seoBlock` and `hero-banner.astro` is
`heroBanner`. No schema states its own name. What an Entry is *called* in the admin is the
shallowest `text()` in it; `named: 'title'` nominates one instead. Which fields the admin draws
together on one tab is `parts: [{ name: 'Contact', fields: ['phone', 'email'] }]`, a Part; it
arranges the panel only, and the build never reads it.

Past the schema it is an ordinary Astro component: scoped and global `<style>`, a `<script>`, a
client island, an imported stylesheet or asset, a layout and child components are all fine.
`naut check` compiles and imports the file for its schema without running Astro, so none of that
is evaluated.

Each of the first two examples is one file, in two blocks: the schema, then the markup.

**Fixed** is the shape where the component draws the whole page. This one carries a `repeat`.

```ts
import { defineSchema, image, money, repeat, text, type InferProps } from 'nautcms'

export const schema = defineSchema({
  fields: {
    title: text(),
    intro: text({ multiline: true }),
    price: money(),
    photo: image(),
    steps: repeat({ heading: text(), detail: text({ multiline: true }) }),
  },
  routable: true,
})

type Props = InferProps<typeof schema>
```

```astro
---
const { title, intro, price, photo, steps = [], path } = Astro.props
---

<article data-path={path}>
  {photo && <img src={`/${photo.key}`} alt={photo.alt} width={photo.width} height={photo.height} />}
  <h1>{title}</h1>
  <p>{intro}</p>
  <p>{price?.formatted}</p>
  <ol>{steps.map((step) => <li><h2>{step.heading}</h2><p>{step.detail}</p></li>)}</ol>
</article>
```

**Every field may be absent** on the Draft an Editor is still typing, and the props type says so.
That is what the markup above is doing: print a string freely, default a list, guard an object.

A Key is store-relative and never a URL, so `/${key}` is the spelling for committed media; a site
whose media moved to a bucket writes its own origin in front.

Nothing about the page's URL is declared either. An Entry's **Path** is its file's location under
`contentRoot` (default `src/content/`): `about/team.md` *is* `/about/team`.

## 2. What silently breaks

Every item names the `naut check` rule that catches it, or says nothing does. Rule ids are stable.
The items nothing catches are the dangerous ones.

### Schema

- A field named `slug` on a routable Type is a second slug nothing reads that appears to control a
  URL it does not. `slug-declared-as-field`
- A field name beginning with `_` collides with the keys the CMS writes, `_id`, `_type` and `_key`,
  at every depth. `field-name-underscore-prefixed`
- A bare Zod type, `link().array()`, or a `kind` written into `.meta()` by hand is a field no widget
  renders. A list of links is `repeat({ link: link() })`. `field-without-widget`
- A `select()` with one option gives an Editor a control that cannot change anything, and whatever
  reads the field reads a constant. `select-one-option`
- `.meta({ required })` and `.meta({ default })` restate what the absence of `.optional()` and the
  presence of `.default()` already say, and nothing reads them. `meta-duplicates-required-or-default`
- A misspelled `.meta()` key, `helpText` for `help`, compiles, and the sentence never appears under
  the control. `meta-key-unrecognised`
- A Part naming a field the Type has not got, `emial` for `email` or a dotted path into a `group()`,
  loses the whole tab: the fields scatter back into the arrangement the Part was declared to
  override. A compiler refuses it; nothing else does. `part-field-unknown`
- One field named by two Parts is drawn under the first, so the second tab is a field short. Two
  Parts sharing a name, or one called `Content` beside the tab that holds whatever no Part placed,
  are two tabs an Editor cannot tell apart. `part-field-placed-twice`
- A `fits` entry naming a slot that is not there, including one whose field was renamed, orphans the
  component: it never reaches the admin. `fits-target-missing`
- A slot no Type declares `fits` for offers an Editor an empty list. `slot-nothing-fits`
- A Type no Entry is of and no Placement names has never been rendered, so a clean run says nothing
  about it. One that is neither routable nor `fits` anything is yours to call, and exempt.
  `type-never-rendered`
- A `ref` whose target names no Type can never resolve. `ref-type-missing`
- A `money()` field with no `currency` in config is a price nothing can render, and there is no
  default to invent. `money-currency-missing`
- A `slot` inside a `repeat`. Zod accepts it, and a slot's id is its Type name and its field name —
  so a slot at depth has no id for any `fits` to name and nothing could ever be placed in it.
  `slot-inside-repeat`
- A loop in the fits graph makes the schema recursive. `fits-cycle`
- A component authored without regenerating the registry renders as nothing at all. `registry-stale`
- Routable Types and no `src/layouts/Site.astro`. Every page renders with no `<html>`, no `<title>`
  and no canonical. `site-layout-missing`
- A hand-written `src/pages/index.astro` beats the Entry at `/`, so the homepage an Editor publishes
  never appears. `pages-index-shadows-homepage`
- Choosing `body: slot()` where the page needed `body: richText()`, or the reverse, is not a
  validation error. It is a Type that quietly cannot express what the page needs, found by an Editor
  months later. **Nothing catches this**, and §3 carries the test.
- Name a Type's prose field `body`. That is the one field written as the file's markdown body. Under
  any other name it is a YAML string in the header. **Nothing catches this.**
- A Type with no Fields cannot be shared: there is no content to sync, so you change the component
  and every page changes on the next deploy. **Nothing catches this.**
- A `ref` cycle is legal, and resolution stops at the first hop by construction rather than by a
  guard. **Nothing catches this.**

### Rich text

- Narrowing a field destroys content already written with the construct, and turning `headings` off
  empties the whole body rather than only its headings. `{ blocks: false }` turns off headings, lists
  and quotes together. `body-construct-dropped`
- Two level-one headings in one Entry, from an H2 spelled with one `#` or a title pasted into the
  body. `body-multiple-h1`
- A soft wrap is a space. A line ending in `\` is a hard break and reaches the site as a `<br>`,
  which is what an agent re-wrapping a paragraph produces. **Nothing catches this.**
- H4, H5 and H6 render correctly although the block set stops at H3, so an Editor can neither make
  one nor restore one they delete. **Nothing catches this.**

### Content files

- A file stating no `_id` has no identity: no Draft key, no reference target, no history through a
  rename. `entry-id-missing`
- Two files carrying one `_id`, which is what copy-pasting a file does. One Draft serves both, and
  every reference resolves to whichever was read first. `entry-id-duplicate`
- A `_type` naming no Type, or missing, renders the Entry as an empty page. `entry-type-unknown`
- A reference whose Entry is gone. A **list drops what it cannot resolve**, a **single `ref` goes
  `null`**, prose keeps the words and loses the anchor, and a **`link()` is dropped whole**. Those
  four are warnings, because deleted and unpublished are one state. At a redirect target it is an
  error. `entry-reference-dead`
- The same field with an address **typed in** instead, that no page, `src/pages` file, redirect or
  `public/` file answers. `link-href-unanswered`
- A `ref` holding a bare Id rather than `entry:<id>`. It parses, resolves to nothing, and the
  component is handed the Id itself. `ref-value-not-a-reference`
- `about.md` beside `about/index.md`. One Entry is served and the other is unreachable, with nothing
  saying which. `path-claimed-twice`
- A redirect whose source is a published page wins, and the page's bytes are never emitted.
  `redirect-shadowed-by-page`
- A redirect at an Entry the site serves at no address is a 301 into a 404.
  `redirect-target-not-served`
- Redirects pointing at each other leave a visitor at the browser's redirect limit. `redirect-cycle`
- No `_seo.description` on a published page of a Type that declared `seo: 'described'`. A Type that
  has not asked is not checked. `page-missing-description`
- `alt: ''` satisfies the schema, so the photograph reaches the site announcing nothing, unless it
  says `decorative: true` beside it or `media.json` describes the photograph. `_seo.image` is
  included. `image-missing-alt`
- An image Key in no row of the committed media index. `image-key-missing-from-index`
- An image placed without its width and height. The check prints the two numbers to paste.
  `image-dimensions-missing`
- A committed media library past the threshold: Vercel clones the tree on every build, and every
  publish is a build. `committed-media-oversize`
- `.cms/` present and not git-ignored leaks half-written Drafts into every deployment.
  `local-draft-store-committed`
- A YAML sequence's order **is** the page's order, dragged there by an Editor. Sorting one is a
  content change, not a tidy-up. **Nothing catches this.**

### Preview and runtime

- `Astro.url` in a component is the preview's URL in a Preview. `getPath()` is the page's own Path
  in both, and the layout emits `canonical` and `og:url` from the Entry.
- `Astro.url.searchParams` is empty on a prerendered page, so a campaign parameter read in the
  frontmatter bakes one value in at build. The form works, the enquiry arrives, the attribution is
  blank. **Nothing catches this.**
- A save re-renders only the sections that changed, in place, so a listener your layout bound at load
  is left on a node that has gone. Delegate from `document`. **Nothing catches this.**
- Your component is rendered **out of its page**, in a palette row laid out at 1240 or at a phone's
  390 and scaled down to fit, and in the media picker's detail column, so it looks wrong there if it
  reads a CSS variable its layout sets, expects to be a grid child, or sizes off the viewport.
  **Nothing catches this.**
- `drafts: 'browser'` keeps each Draft in the browser it was typed in, so it is for a site with one
  Editor. The admin can't see how many will sign in. **Nothing catches this.**

To move to a bucket, publish or discard every Draft, make a private store bucket for Drafts and a
public media bucket, and run `naut init`. It proves both and copies `public/media` in. Delete
`drafts: 'browser'` last. An upload is public from the moment it lands, before the page holding it
is published.

## 3. The model

### Is it a Type at all?

An Editor puts it on a page and fills it in. If a developer chooses it and an Editor never sees it,
it is an ordinary component. `Button.astro` is a component, not a Type.

A Type that is **neither routable nor `fits` anything** is the third answer: an Editor fills it in,
and your own markup renders it — a header, a footer, a booking widget a layout imports and hands the
Entry to. The CMS never renders it, so `type-never-rendered` is silent about it by design, and so is
an import you never wired up.

### The widget gate, then the widgets

A widget exists only where a plain text input would let an Editor produce data that is **wrong**
rather than merely ugly. That gate is why `tags`, `colour` and `json` are absent; a set of terms is
part 4's. The set is closed at the import, so a widget you invent is a type error where you wrote
it.

| Widget | What it is |
|---|---|
| `text()` | a string. `text({ multiline: true })` is a textarea that wraps; `lines: 'kept'` keeps its breaks, `<Lines>` draws them |
| `richText()` | Portable Text. `richText.inline()` for marks only, `richText({ headings: false })` to narrow |
| `number()` | a number. `.int()` where that is wanted |
| `money()` | a price in minor units. `currency` in `astro.config.mjs`, no default. Props get `{ amount, currency, formatted }` |
| `boolean()` | a boolean |
| `date()` | ISO on disk, a `Date` in props |
| `image()` | `{ key, alt, decorative?, width, height }`. Alt lives here; `media.json` holds the photograph's own, which the picker offers at every placement |
| `file()` | `{ key }`, usually a PDF |
| `link()` | `{ href, label, target?, rel? }`. A page, or an address |
| `select(['left', 'right'])` | a string union. `select({ left: 'Left aligned' })` where the value reads badly alone |
| `ref('author')` | stores `entry:<id>`, never a bare Id. `.array()` for many |
| `repeat({ … })` | an ordered list of one object shape. It nests: `repeat({ heading: text(), links: repeat({ link: link() }) })` is a footer column |
| `slot()` | an ordered list of Placements. `slot().min(1).max(1)` for cardinality |

`group({ … })` nests fields and is not a widget: it has no control.
Every builder returns a Zod type, so `.optional()`, `.default()`, `.min()` and `.max()` are Zod's.
Only `ref()` has a control for `.array()`. Required is the absence of `.optional()`.

### A component knows its own Entry

Props are the declared fields, plus `_id`, plus `path` when the Type is routable. Neither of those
two is declared and there is no marker. `_id` is optional exactly when a Type is embeddable and
neither routable nor a singleton, because an inline Placement lives in its parent's file and has no
Id of its own.

### A `ref` gives you data, a slot gives you a page, a `link()` gives you a URL

A **`ref` field** resolves to the target's Fields only. No body, no slots, and the target's own refs
arrive as the `entry:` strings they are stored as, because you render it in your own markup. A
**Placement in a slot** resolves to the target's whole props, because the target's own component
renders it. Both add `_id`, and both add `path` when the target Type is routable.

A **`link()`** the Editor pointed at a page stores `entry:<id>`, so a rename moves the link with it,
and Resolution hands you the Path. `target` and `rel` are attribute values, set by switches.

### The three Type shapes

| Shape | Schema | When |
|---|---|---|
| **Fixed** | `fields` only | an Event, a Treatment. The component draws the page |
| **Written** | `body: richText()` | a news post, prose the Editor writes |
| **Composed** | `body: slot()` | a landing page, Placements the Editor assembles |

Slot or `richText`? The test is *could an Editor ever need a gallery in the middle of this?*

Variation **within** one Type is an ordinary field, never a second Type: a
`layout: select(['standard', 'feature'])` the component branches on, or an optional `slot()` it
falls back through. A second `eventCustom` Type splits *all events* for listing, and forces the
choice at creation rather than when the need appears.

Two blocks a port found grouped, one borrowing the other's heading, are one Type: a slot holds
order, not grouping. Flattened, they are Placements an Editor drags apart, and the page renders
correctly either way.

**Written**, carrying a `ref`:

```ts
import { defineSchema, date, ref, richText, text, type InferProps } from 'nautcms'

export const postSchema = defineSchema({
  fields: {
    title: text(),
    published: date(),
    author: ref('author'),
    body: richText(),
  },
  routable: true,
})

type PostProps = InferProps<typeof postSchema>
```

```astro
---
import RichText from 'nautcms/content/RichText.astro'

const { title, published, author, body } = Astro.props
---

<article>
  <h1>{title}</h1>
  <p>{published?.toLocaleDateString('en-GB')}{author && `, by ${author.name}`}</p>
  <RichText value={body} />
</article>
```

A single `ref` is nullable whatever the schema says.

A body is markdown on disk and Portable Text in props. `<RichText>` renders it through one fixed map
with no component overrides, so its headings, lists and quotes are styled by descendant selectors in
a **global** rule — a `prose` class, a stylesheet, or `<style is:global>`. A scoped `<style>` in the
Type is where an author reaches, and it matches nothing: this markup comes from a child, and scoping
stamps only the Type's own template.
`<RichText inline />` drops the block wrappers, for a standfirst inside a heading.

**Composed.** A whole file in one block, because `init` writes it verbatim as your starter Type:

<!-- naut:starter-type -->

```astro
---
import { defineSchema, slot, text, type InferProps } from 'nautcms'
import Placements from 'nautcms/content/Placements.astro'

export const schema = defineSchema({
  fields: {
    title: text(),
    body: slot(),
  },
  routable: true,
})

type Props = InferProps<typeof schema>

const { title, body, path } = Astro.props
---

<main data-path={path}>
  <h1>{title}</h1>
  <Placements value={body} />
</main>
```

A slot declares only that it is a slot. What may go in it is computed from every Type's `fits`: a
child names its parents and a parent never lists its children, so adding an embeddable Type is one
new file carrying `fits: ['page.body']`.

`<Placements>` defaults a slot, so a Composed Type needs no guard for its body.

**Embeddable**, written by `init` too, unregistered until you give it a `fits`:

<!-- naut:starter-section -->

```astro
---
import { defineSchema, richText, text, type InferProps } from 'nautcms'
import RichText from 'nautcms/content/RichText.astro'

// Adopt it by adding `fits: ['page.body']`.
export const schema = defineSchema({
  fields: {
    heading: text().optional(),
    body: richText(),
  },
})

type Props = InferProps<typeof schema>

const { heading, body } = Astro.props
---

<section>
  {heading !== undefined && <h2>{heading}</h2>}
  <RichText value={body} />
</section>
```

## 4. Recipes

Four patterns sit in `node_modules/nautcms/RECIPES.md`. Go there when:

- a field sorts Entries into **categories or tags**: `ref` or `select` decides who owns the list
  and whether a term has a page;
- an Editor needs a **form**, which is a Type with a slot of field Types and never a widget;
- the same Placement has to appear on **several pages**;
- a site needs **its own admin screen** for data that isn't content.

## 5. The edges

- **Starwind.** Reach for Starwind primitives in the site's own components for accessible dialogs,
  menus and tabs. `npx starwind init` is the developer's to run.
- **SEO is `routable`'s and no field declares it.** A file carries
  `_seo: { title, description, image, noindex }` beside `_id` and `_type`. The injected route
  resolves it, with structural fallbacks, and hands the values to `src/layouts/Site.astro`.
- **`Site.astro` is the one place the site writes head tags**, so a tracking snippet or a font
  preload is an edit there. Its `canonical` and `og:url` lines are load-bearing and no rule reads
  them.
- **`redirects.json`** sits at the project root. One row per redirect, 301 always, no expiry and no
  options. A rename writes `entry:<id>`, so a second rename collapses the chain rather than extending
  it, and nothing is ever removed.
- **The read API is an array.** `await getEntries('post')` is every Entry of a Type, typed from its
  schema, filtered and sorted in JavaScript: no query language, `total` is `.length`.
  `getEntry(idOrPath)` is one Entry or `null`, untyped: neither says which Type.
  `getSingleton('header')` is a singleton's one Entry or `null`, typed. All answer from the read the
  CMS opens round `Site.astro`, so a layout reads the chrome; your own page opens one with
  `<Reading>`.
- **Annexes import nothing of Naut's but `nautcms/annex` and the read API.** `naut:admin` is a
  build error.
- **`naut check` cannot see three things, by design.** It holds no credentials, it reads no markup,
  and rows are the admin's job — roughly half of what a CMS should catch.
<!-- naut:end -->
