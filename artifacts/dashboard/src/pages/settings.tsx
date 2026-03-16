import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card-custom";
import { Button } from "@/components/ui/button-custom";
import { Badge } from "@/components/ui/badge-custom";
import { usePages } from "@/hooks/use-pages";
import { Facebook, Instagram, Link2, Unlink, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { data: pages } = usePages();

  const connectedFBPages = pages?.filter(p => p.is_active) || [];
  const connectedIGAccounts = pages?.filter(p => p.instagram_account_id && p.is_active) || [];

  const handleConnectFacebook = () => {
    const appId = (window as any).__FB_APP_ID || "";
    if (!appId) {
      alert("Facebook App ID chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
      return;
    }

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

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=openclaw_auth`;

    window.location.href = authUrl;
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground">Quản lý kết nối tài khoản và cấu hình hệ thống.</p>
      </div>

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
                  Đã kết nối
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
                    <Badge variant="secondary" className="text-xs">Đang lắng nghe</Badge>
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
            >
              <Link2 className="w-4 h-4 mr-2" />
              {connectedFBPages.length > 0 ? "Kết nối thêm trang" : "Kết nối Facebook"}
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
                  Đã kết nối
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
