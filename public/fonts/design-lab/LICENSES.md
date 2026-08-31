# Vendored design-lab fonts — copyright and licence

Every font file in this directory is third-party software, redistributed here
under the **SIL Open Font License, Version 1.1**. Nothing in this directory is
original work of this repository.

The files here, and the two promoted to `public/fonts/` (Archivo and Newsreader
— see `public/fonts/LICENSES.md`, which now carries their notices), were obtained from the Google Fonts CSS API
(`https://fonts.googleapis.com/css2`, `latin` subset) on **6 August 2026** and
renamed to the local filenames below. They are subsets: only the `latin` glyph
set is present, and the variable axes listed are those exposed by the upstream
release. Version strings are read from each file's own `name` table (name ID 5),
so they describe the exact binaries committed here.

The faces remaining in this directory are used **only** by the `/design-lab`
routes and are loaded solely by `app/design-lab/design-lab.css`. Archivo and
Newsreader were promoted to production with direction D3, and JetBrains Mono
with the public opening on 31 August 2026; all three now also live in
`public/fonts/` with their notices in `public/fonts/LICENSES.md`.

JetBrains Mono is the one face present in both places. The lab copy stays
because this directory has to remain deletable on its own, and the production
stylesheet may not reach into it — `app/globals.css` loads
`/fonts/jetbrains-mono.woff2` and never the lab path.

Under OFL 1.1 §1 and §2 this notice, the copyright statements below and the full
licence text must travel with the font files. Do not move, rename or delete a
`.woff2` in this directory without carrying its entry here with it.

---

## Files

| File | Family | Version | Axes | Glyphs |
|---|---|---|---|---|
| `space-grotesk.woff2` | Space Grotesk | 2.000 | `wght` 300–700 | 291 |
| `jetbrains-mono.woff2` | JetBrains Mono | 2.211 | `wght` 100–800 | 394 |
| `instrument-serif.woff2` | Instrument Serif | 1.000 | static (400) | 220 |

## Copyright and upstream source

### Space Grotesk — `space-grotesk.woff2`

```
Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk)
```

- Designer: Florian Karsten
- Upstream project: https://github.com/floriankarsten/space-grotesk
- Google Fonts catalogue entry: https://github.com/google/fonts/tree/main/ofl/spacegrotesk
- Version in this repository: 2.000
- Licence: SIL Open Font License 1.1 (full text below)

### JetBrains Mono — `jetbrains-mono.woff2`

```
Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)
```

- Designers: JetBrains, Philipp Nurullin, Konstantin Bulenkov
- Upstream project: https://github.com/JetBrains/JetBrainsMono
- Google Fonts catalogue entry: https://github.com/google/fonts/tree/main/ofl/jetbrainsmono
- Version in this repository: 2.211
- Licence: SIL Open Font License 1.1 (full text below)

### Instrument Serif — `instrument-serif.woff2`

```
Copyright 2022 The Instrument Serif Project Authors (https://github.com/Instrument/instrument-serif)
```

- Designers: Rodrigo Fuenzalida, Jordan Egstad
- Upstream project: https://github.com/Instrument/instrument-serif
- Google Fonts catalogue entry: https://github.com/google/fonts/tree/main/ofl/instrumentserif
- Version in this repository: 1.000
- Licence: SIL Open Font License 1.1 (full text below)

---

## Reserved Font Names

None of the five upstream `OFL.txt` files declare a Reserved Font Name, so OFL
1.1 §3 imposes no renaming obligation on the subsets committed here. The files
are unmodified apart from Google Fonts' own `latin` subsetting and the local
rename; the family names in each `name` table are unchanged.

---

## SIL Open Font License, Version 1.1

The licence text is byte-identical across all five upstream `OFL.txt` files
(modulo trailing whitespace and the `http`/`https` spelling of the SIL URL), so
it is reproduced once. Each family's own copyright line is quoted above and is
the copyright notice that applies to that file.

```
This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
