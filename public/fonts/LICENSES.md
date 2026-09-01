# Vendored fonts — copyright and licence

Every `.woff2` in this directory is third-party software. Nothing here is
original work of this repository.

| File | Family | Version | Axes | Glyphs | Licence |
|---|---|---|---|---|---|
| `archivo-latin.woff2` | Archivo | 2.001 | `wght` 100–900, `wdth` 62–125 | 302 | SIL OFL 1.1 |
| `newsreader-latin.woff2` | Newsreader | 1.003 | `wght` 200–800, `opsz` 6–72 | 262 | SIL OFL 1.1 |
| `jetbrains-mono.woff2` | JetBrains Mono | 2.211 | `wght` 100–800 | 394 | SIL OFL 1.1 |

Archivo and Newsreader were obtained from the Google Fonts CSS API
(`https://fonts.googleapis.com/css2`, `latin` subset) on **6 August 2026**, and
promoted from `public/fonts/design-lab/` to production on **7 August 2026** when
design direction D3 became the game page. JetBrains Mono came from the same
API on the same day and was promoted by the same route on **31 August 2026**,
when the public opening began setting keyboard hints and instrument cues in a
monospace face. All three are `latin` subsets; the variable axes listed are
those exposed by the upstream release, and version strings are read from each
file's own `name` table (name ID 5).

The promoted `jetbrains-mono.woff2` is a byte-identical copy of the design-lab
file, not a re-subset: the production stylesheet must never reference anything
under `public/fonts/design-lab/`, because that directory exists to be deleted
with the lab. A copy in both places is the deliberate cost of that separation.

Under OFL 1.1 §1 and §2 this notice, the copyright statements below and the full
licence text must travel with the font files. **Do not move, rename or delete a
`.woff2` in this directory without carrying its entry here with it** — that rule
is why this file exists, and it is what was followed when Archivo, Newsreader
and JetBrains Mono moved up from the design-lab directory.

## Copyright and upstream source

### Archivo — `archivo-latin.woff2`

```
Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)
```

- Designer: Omnibus-Type
- Upstream project: https://github.com/Omnibus-Type/Archivo
- Google Fonts catalogue entry: https://github.com/google/fonts/tree/main/ofl/archivo
- Version in this repository: 2.001
- Licence: SIL Open Font License 1.1 (full text below)

### Newsreader — `newsreader-latin.woff2`

```
Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader)
```

- Designer: Production Type
- Upstream project: https://github.com/productiontype/Newsreader
- Google Fonts catalogue entry: https://github.com/google/fonts/tree/main/ofl/newsreader
- Version in this repository: 1.003
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

---

## Reserved Font Names

None of the upstream `OFL.txt` files declare a Reserved Font Name, so OFL 1.1 §3
imposes no renaming obligation on the subsets committed here. The files are
unmodified apart from Google Fonts' own `latin` subsetting and the local rename;
the family names in each `name` table are unchanged.

---

## SIL Open Font License, Version 1.1

Reproduced in full, as OFL 1.1 §2 requires of every copy of the font software.
Its absence here was a real compliance gap while this notice said "full text
below" and carried none. The text is byte-identical across the upstream
`OFL.txt` files, so it is reproduced once; each family's own copyright line is
quoted above and is the notice that applies to that file.

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
