# Studio Lobby Host — Lighting Integration Pass

| Field | Value |
|---|---|
| Status | **Active — highest priority** |
| Date | 2026-07-18 |
| Type | Engineering / compositing objective |
| Authority | Pose v1.0 locked · Host Character Standard locked · Lobby environment locked |

---

## Lighting reference, not design reference

The Lobby plate and any “looks like she belongs” screenshots are **lighting references only**.

They are **not** permission to redesign, restyle, or re-illustrate the Host.

**Treat the Lobby environment as the lighting source, not as an artistic style reference. The goal is seamless compositing, not re-illustration.**

---

## What does not change

| Locked | Do not touch |
|--------|----------------|
| Pose | Pose v1.0 (right hand presents, left hand tablet) |
| Clothing | THE STUDIO tee, denim, jeans, orange sneakers |
| Face / identity | Same person, glasses, expression language |
| Proportions | Same body scale in the asset |
| Podium | Leave where it is |
| Lobby layout | Environment plate locked |

Think of it like a movie: **same actor, same stage, same camera — only the lighting changes.**

---

## Problem

The Host currently looks like she came from another room.

The Lobby has:

- warm hanging Edison lights  
- bright window light  
- warm floor bounce  
- subtle shadow direction  
- slightly warmer white balance  

The Host does not match those conditions. People notice immediately even if they cannot name why.

---

## Objective

**Do not redesign the Host. Do not regenerate the Host. Do not change pose, proportions, or clothing.**

Create production-ready **transparent PNG** assets that appear naturally lit by the Studio Lobby environment — seamless compositing of the **existing** Host.

---

## Lighting targets

The Host should appear illuminated by:

| Role | Source |
|------|--------|
| Primary | Large daylight windows behind and beside her |
| Secondary | Warm Edison bulbs overhead |
| Fill | Soft warm reflections from wood floor and interior |

### Increase

- facial warmth  
- shoulder / hair edge highlights (window rim)  
- clothing integration with room color bounce  
- subtle environmental color reflection  

### Reduce

- flat beauty-dish / isolated studio lighting  
- mismatched shadow density  
- “sticker from another room” read  

### Maintain

- identity, skin tone family, glasses, expression  
- tablet, pose, silhouette, canvas registration  

---

## Output

| File | Rule |
|------|------|
| `studio-lobby-host-base.png` | Eyes open — runtime default |
| `studio-lobby-host-eyes-open.png` | Same canvas as base |
| `studio-lobby-host-eyes-closed.png` | Same canvas; eyelids only differ |

**Same canvas. Same feet registration. Same pose. Only lighting should change.**

True RGBA transparency — no painted checkerboard.

Optional later: painted contact-shadow plate. CSS contact shadow may remain until then.

---

## Explicitly out of scope

- Making her “prettier”  
- Changing proportions or anatomy  
- Changing clothes, hair, or face design  
- Resizing or redesigning the podium / kiosk  
- Lobby environment redesign  
- Re-illustration “in the style of” the Lobby render  

---

## Done when

She feels like she was always standing in that Lobby — not placed into it afterward. Podium stays primary.
