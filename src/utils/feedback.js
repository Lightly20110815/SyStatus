// 根据后端返回的保存/提交/推送状态，统一弹出轻提示。
// 推送成功 → 成功提示；仅本地保存成功 → 温和的"推送失败"提示，可展开详情。
export function pushToastResult(toast, res, { synced, localOnly }) {
  if (res && res.pushed) {
    toast.show({ kind: "ok", message: synced });
  } else {
    toast.show({
      kind: "warn",
      message: localOnly,
      detail: res && res.pushError ? res.pushError : undefined,
      duration: 6000,
    });
  }
}
