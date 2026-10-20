import { controlsInstallUrl } from "./controlsInstall";

const PID = "0b8e7d3c-1f2a-4b5c-9d6e-7f8a9b0c1d2e";
const hs = (extra: object) => ({ url: "http://localhost", expires: Date.now() + 60_000, ...extra });

describe("controlsInstallUrl", () => {
  it("points at the controls app's install page", () => {
    expect(controlsInstallUrl(hs({ controls: "http://localhost/controls/" }), "accuracy-checklist"))
      .toBe("http://localhost/controls/install?slug=accuracy-checklist");
  });
  it("preselects the project when it is a pid", () => {
    expect(controlsInstallUrl(hs({ controls: "https://aisc.example/controls", project: PID }), "c"))
      .toBe(`https://aisc.example/controls/install?slug=c&project=${PID}`);
  });
  it("leaves out a project that is not a pid", () => {
    expect(controlsInstallUrl(hs({ controls: "http://localhost/controls", project: "x&y=1" }), "c"))
      .toBe("http://localhost/controls/install?slug=c");
  });
  it("encodes the slug", () => {
    expect(controlsInstallUrl(hs({ controls: "http://localhost/controls" }), "a b/c"))
      .toBe("http://localhost/controls/install?slug=a%20b%2Fc");
  });
  it.each([null, hs({}), hs({ controls: "javascript:alert(1)" }), hs({ controls: "//evil.example" }),
           hs({ controls: "/controls" }), hs({ controls: "not a url" })])(
    "refuses anywhere that is not an absolute http(s) address (%o)", (payload) => {
      expect(controlsInstallUrl(payload as any, "c")).toBeNull();
    });
});
