import { describe, expect, it } from "vitest";

import {
  buildDevDevicePreviewUrl,
  ownerQaPageLabelForPath,
  pickLanIPv4,
  resolveDevPreviewPort,
} from "@/lib/dev-device-preview";

describe("dev-device-preview", () => {
  it("picks a private LAN IPv4 and skips virtual adapters", () => {
    const address = pickLanIPv4({
      "vEthernet (WSL)": [
        {
          address: "172.28.16.1",
          netmask: "255.255.240.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: false,
          cidr: "172.28.16.1/20",
        },
      ],
      "Wi-Fi": [
        {
          address: "10.1.10.208",
          netmask: "255.255.255.0",
          family: "IPv4",
          mac: "aa:bb:cc:dd:ee:ff",
          internal: false,
          cidr: "10.1.10.208/24",
        },
      ],
      "Loopback Pseudo-Interface 1": [
        {
          address: "127.0.0.1",
          netmask: "255.0.0.0",
          family: "IPv4",
          mac: "00:00:00:00:00:00",
          internal: true,
          cidr: "127.0.0.1/8",
        },
      ],
    });

    expect(address).toBe("10.1.10.208");
  });

  it("builds a LAN phone URL from host port and current path", () => {
    expect(resolveDevPreviewPort("localhost:3011")).toBe("3011");
    expect(
      buildDevDevicePreviewUrl({
        lanAddress: "10.1.10.208",
        port: "3011",
        pathname: "/studio-lobby",
        search: "",
      }),
    ).toEqual({
      url: "http://10.1.10.208:3011/studio-lobby",
      usedLan: true,
      note: null,
    });
  });

  it("falls back to localhost with an owner-readable note", () => {
    const result = buildDevDevicePreviewUrl({
      lanAddress: null,
      port: "3011",
      pathname: "/",
      search: "?debug=1",
    });
    expect(result.usedLan).toBe(false);
    expect(result.url).toBe("http://localhost:3011/?debug=1");
    expect(result.note).toMatch(/No LAN IP detected/);
  });

  it("strips studioReview from QR URLs so phones open the Lobby, not the sheet", () => {
    expect(
      buildDevDevicePreviewUrl({
        lanAddress: "10.1.10.208",
        port: "3011",
        pathname: "/",
        search: "?studioReview=1",
      }).url,
    ).toBe("http://10.1.10.208:3011/");

    expect(
      buildDevDevicePreviewUrl({
        lanAddress: "10.1.10.208",
        port: "3011",
        pathname: "/",
        search: "?studioReview=1&debug=1",
      }).url,
    ).toBe("http://10.1.10.208:3011/?debug=1");
  });

  it("labels known journey paths", () => {
    expect(ownerQaPageLabelForPath("/")).toBe("Studio Lobby");
    expect(ownerQaPageLabelForPath("/studio-lobby")).toBe("Studio Lobby");
    expect(ownerQaPageLabelForPath("/route-map")).toBe("Studio Guide");
  });
});
