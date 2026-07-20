// Anonymous device id — auth v1 ตาม spec 2.1 (LINE Login = v1.1)
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("gn_device");
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem("gn_device", id);
  }
  return id;
}

export function clearDeviceId() {
  if (typeof window !== "undefined") window.localStorage.removeItem("gn_device");
}
