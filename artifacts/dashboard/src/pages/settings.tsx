import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Badge } from "@/components/ui/badge-custom";
import { usePages } from "@/hooks/use-pages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Facebook, Instagram, Link2, Unlink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function useSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    success: params.get("success"),
    error: params.get("error"),
    count: params.get("count"),
  };
}

function useFBConfig() {
  return useQuery({
    queryKey: ["/api/auth/facebook/config"],
    queryFn: () => fetchApi<{ configured: boolean; appId: string | null }>("/api/auth/facebook/config"),
  });
}

export default function SettingsPage() {
  const { data: pages, refetch: refetchPages } = usePages();
  const { data: fbConfig } = useFBConfig();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.success) {
      setNotification({
        type: "success",
        message: `Kết nối thành công ${searchParams.count || ""} trang Facebook!`,
      });
      refetchPages();
      window.history.replaceState({}, "", "/settings");
    } else if (searchParams.error) {
      setNotification({
        type: "error",
        message: `Lỗi kết nối: ${searchParams.error}`,
      });
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const connectedFBPages = pages?.filter(p => p.is_active) || [];
  const connectedIGAccounts = pages?.filter(p => p.instagram_account_id && p.is_active) || [];

  const [connecting, setConnecting] = useState(false);

  const handleConnectFacebook = async () => {
    if (!fbConfig?.configured || !fbConfig.appId) {
      alert("Facebook App ID chưa được cấu hình trên server. Vui lòng liên hệ quản trị viên.");
      return;
    }

    setConnecting(true);
    try {
      const initData = await fetchApi<{ state: string }>("/api/auth/facebook/init");

      const redirectUri = `${window.location.origin}/api/auth/facebook/callback`;
      const scope = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_metadata",
        "pages_messaging",
        "pages_manage_posts",
        "pages_read_user_content",
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_manage_messages",
      ].join(",");

      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${fbConfig.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${initData.state}`;

      window.location.href = authUrl;
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Không thể khởi tạo kết nối." });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (pageId: string) => {
    if (!confirm("Bạn có chắc muốn ngắt kết nối trang này?")) return;
    setDisconnecting(pageId);
    try {
      await fetchApi(`/api/auth/facebook/disconnect/${pageId}`, { method: "POST" });
      await refetchPages();
      setNotification({ type: "success", message: "Đã ngắt kết nối trang thành công." });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Không thể ngắt kết nối." });
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground">Quản lý kết nối tài khoản và cấu hình hệ thống.</p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          notification.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-blue-500/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mr-4">
                  <Facebook className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Facebook</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Quản lý trang & bình luận</p>
                </div>
              </div>
              {connectedFBPages.length > 0 ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã kết nối ({connectedFBPages.length})
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  Chưa kết nối
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedFBPages.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Các trang đã kết nối:</p>
                {connectedFBPages.map(page => (
                  <div key={page.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3"></div>
                      <div>
                        <p className="text-sm font-medium">{page.page_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: {page.page_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Đang lắng nghe</Badge>
                      <button
                        onClick={() => handleDisconnect(page.page_id)}
                        disabled={disconnecting === page.page_id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Ngắt kết nối"
                      >
                        {disconnecting === page.page_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlink className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Facebook className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Chưa có trang Facebook nào được kết nối.</p>
                <p className="text-xs text-muted-foreground mt-1">Kết nối để AI tự động quản lý bình luận và tin nhắn.</p>
              </div>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleConnectFacebook}
              disabled={!fbConfig?.configured || connecting}
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              {!fbConfig?.configured
                ? "Facebook App chưa cấu hình"
                : connecting
                  ? "Đang kết nối..."
                  : connectedFBPages.length > 0
                    ? "Kết nối thêm trang"
                    : "Kết nối Facebook"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-pink-500/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mr-4">
                  <Instagram className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Instagram</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Quản lý tin nhắn & bình luận</p>
                </div>
              </div>
              {connectedIGAccounts.length > 0 ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã kết nối ({connectedIGAccounts.length})
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="w-3 h-3" />
                  Chưa kết nối
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedIGAccounts.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Tài khoản đã kết nối:</p>
                {connectedIGAccounts.map(page => (
                  <div key={page.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3"></div>
                      <div>
                        <p className="text-sm font-medium">{page.page_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">IG ID: {page.instagram_account_id}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Đang lắng nghe</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Instagram className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Chưa có tài khoản Instagram nào được kết nối.</p>
                <p className="text-xs text-muted-foreground mt-1">Instagram được kết nối tự động qua Facebook Page.</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full border-pink-500/30 hover:bg-pink-500/10 text-pink-400"
              onClick={handleConnectFacebook}
              disabled={!fbConfig?.configured || connecting}
            >
              <Link2 className="w-4 h-4 mr-2" />
              {connectedIGAccounts.length > 0 ? "Kết nối thêm tài khoản" : "Kết nối qua Facebook"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Instagram Business cần được liên kết với Facebook Page để kết nối.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hướng dẫn kết nối</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
              <h4 className="font-medium text-sm">Đăng nhập Facebook</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nhấn nút "Kết nối Facebook" để đăng nhập và cấp quyền cho OpenClaw truy cập các trang bạn quản lý.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
              <h4 className="font-medium text-sm">Chọn trang</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chọn các Facebook Page và tài khoản Instagram Business mà bạn muốn OpenClaw quản lý tự động.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
              <h4 className="font-medium text-sm">Hoàn tất</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI sẽ bắt đầu tự động theo dõi bình luận, phản hồi tin nhắn và gửi báo cáo hàng ngày.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
