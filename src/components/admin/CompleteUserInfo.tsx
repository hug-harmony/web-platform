"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Lock,
  MessageSquare,
  ShoppingCart,
  Video,
  AlertCircle,
  Zap,
  FileText,
  Ban,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface OAuth {
  googleId: string | null;
  appleId: string | null;
  facebookId: string | null;
  primaryAuthMethod: string | null;
}

interface Security {
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastOnline: string | null;
}

interface Conversation {
  id: string;
  otherUser: { id: string; name: string };
  messageCount: number;
  createdAt: string;
}

interface Communications {
  conversations: Conversation[];
  messagesSent: number;
  messagesReceived: number;
}

interface BlockedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Blocking {
  usersBlocked: BlockedUser[];
  blockedByUsers: BlockedUser[];
}

interface Report {
  id: string;
  reportedBy?: string;
  reportedByEmail?: string;
  reportedUser?: string;
  reportedProfessional?: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
}

interface Reports {
  reportsAboutThisUser: Report[];
  reportsSubmittedByUser: Report[];
}

interface CartItem {
  merchandiseId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  totalValue: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  items: OrderItem[];
  paymentStatus: string | null;
  createdAt: string;
}

interface Shopping {
  cart: Cart | null;
  orders: Order[];
}

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  replyCount: number;
}

interface Reply {
  id: string;
  content: string;
  postId: string;
  createdAt: string;
}

interface Content {
  photos: unknown[];
  posts: Post[];
  replies: Reply[];
}

interface Video {
  id: string;
  videoName: string;
  watchedSeconds: number;
  isCompleted: boolean;
}

interface Training {
  videosWatched: Video[];
}

interface SecurityLog {
  id: string;
  eventType: string;
  ipAddress: string | null;
  details: string;
  timestamp: string;
}

interface AdminNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface CompleteUserData {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  status: string;
  isAdmin: boolean;
  createdAt: string;
  oauth: OAuth;
  security: Security;
  activity: {
    appointments: number;
    videoSessions: number;
    postsCreated: number;
    repliesCreated: number;
    reviewsGiven: number;
    profileVisitsReceived: number;
  };
  communications: Communications;
  blocking: Blocking;
  reports: Reports;
  shopping: Shopping;
  content: Content;
  training: Training;
  securityLogs: SecurityLog[];
  adminNotes: AdminNote[];
  survey: {
    rating: number;
    feedback: string | null;
    respondedAt: string;
  } | null;
}

interface CompleteUserInfoProps {
  userId: string;
}

export default function CompleteUserInfo({ userId }: CompleteUserInfoProps) {
  const [data, setData] = useState<CompleteUserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${userId}/complete`);

        if (!response.ok) {
          throw new Error("Failed to fetch complete user data");
        }

        const userData: CompleteUserData = await response.json();
        setData(userData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load complete user data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-[#F3CFC6] border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-[#C4C4C4]">Loading complete user data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load user data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black flex items-center gap-1"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="oauth"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black flex items-center gap-1"
          >
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">OAuth</span>
          </TabsTrigger>
          <TabsTrigger
            value="communications"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black flex items-center gap-1"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value="shopping"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black flex items-center gap-1"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Shop</span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger
            value="content"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
        </TabsList>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader className="bg-[#F3CFC6]/10">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#F3CFC6]" />
                Security & Login Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-black dark:text-white">
                    Email Verification
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-[#C4C4C4]">Verified:</span>{" "}
                      {data.security.emailVerified ? (
                        <span className="text-green-500 font-semibold">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">✗ No</span>
                      )}
                    </p>
                    {data.security.emailVerifiedAt && (
                      <p>
                        <span className="text-[#C4C4C4]">Verified At:</span>{" "}
                        {new Date(
                          data.security.emailVerifiedAt
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-black dark:text-white">
                    Account Lockout
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-[#C4C4C4]">Failed Logins:</span>{" "}
                      {data.security.failedLoginAttempts}
                    </p>
                    {data.security.lockedUntil && (
                      <p>
                        <span className="text-[#C4C4C4]">Locked Until:</span>{" "}
                        <span className="text-red-500 font-semibold">
                          {new Date(data.security.lockedUntil).toLocaleString()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-black dark:text-white">
                    Login History
                  </h3>
                  <div className="space-y-2 text-sm">
                    {data.security.lastLoginAt && (
                      <p>
                        <span className="text-[#C4C4C4]">Last Login:</span>{" "}
                        {new Date(data.security.lastLoginAt).toLocaleString()}
                      </p>
                    )}
                    {data.security.lastLoginIp && (
                      <p>
                        <span className="text-[#C4C4C4]">Last IP:</span>{" "}
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {data.security.lastLoginIp}
                        </code>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-black dark:text-white">
                    Activity
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-[#C4C4C4]">Last Online:</span>{" "}
                      {data.security.lastOnline
                        ? new Date(data.security.lastOnline).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OAuth Tab */}
        <TabsContent value="oauth">
          <Card>
            <CardHeader className="bg-[#F3CFC6]/10">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#F3CFC6]" />
                OAuth & Auth Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#C4C4C4] rounded p-4">
                  <p className="text-sm font-semibold text-[#C4C4C4] mb-2">
                    Primary Auth Method
                  </p>
                  <p className="text-lg font-bold text-black dark:text-white">
                    {data.oauth.primaryAuthMethod || "Not set"}
                  </p>
                </div>

                <div className="border border-[#C4C4C4] rounded p-4">
                  <p className="text-sm font-semibold text-[#C4C4C4] mb-2">
                    Google
                  </p>
                  {data.oauth.googleId ? (
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block break-all">
                      {data.oauth.googleId}
                    </code>
                  ) : (
                    <p className="text-gray-400">Not connected</p>
                  )}
                </div>

                <div className="border border-[#C4C4C4] rounded p-4">
                  <p className="text-sm font-semibold text-[#C4C4C4] mb-2">
                    Apple
                  </p>
                  {data.oauth.appleId ? (
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block break-all">
                      {data.oauth.appleId}
                    </code>
                  ) : (
                    <p className="text-gray-400">Not connected</p>
                  )}
                </div>

                <div className="border border-[#C4C4C4] rounded p-4">
                  <p className="text-sm font-semibold text-[#C4C4C4] mb-2">
                    Facebook
                  </p>
                  {data.oauth.facebookId ? (
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block break-all">
                      {data.oauth.facebookId}
                    </code>
                  ) : (
                    <p className="text-gray-400">Not connected</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications">
          <div className="space-y-4">
            <Card>
              <CardHeader className="bg-[#F3CFC6]/10">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#F3CFC6]" />
                  Messages & Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded p-4 text-center">
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-100">
                      {data.communications.conversations.length}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Conversations
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 rounded p-4 text-center">
                    <p className="text-2xl font-bold text-green-800 dark:text-green-100">
                      {data.communications.messagesSent}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Sent
                    </p>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900 rounded p-4 text-center">
                    <p className="text-2xl font-bold text-purple-800 dark:text-purple-100">
                      {data.communications.messagesReceived}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Received
                    </p>
                  </div>
                </div>

                {data.communications.conversations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black dark:text-white mb-3">
                      Conversations
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {data.communications.conversations.map(
                        (conv: Conversation) => (
                          <div
                            key={conv.id}
                            className="border border-[#C4C4C4] rounded p-3 text-sm"
                          >
                            <p className="font-semibold text-black dark:text-white">
                              {conv.otherUser.name}
                            </p>
                            <p className="text-[#C4C4C4]">
                              {conv.messageCount} messages •{" "}
                              {new Date(conv.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Blocking */}
            {(data.blocking.usersBlocked.length > 0 ||
              data.blocking.blockedByUsers.length > 0) && (
              <Card>
                <CardHeader className="bg-red-100 dark:bg-red-900">
                  <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-100">
                    <Ban className="h-5 w-5" />
                    Block List
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {data.blocking.usersBlocked.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-black dark:text-white mb-2">
                        Blocked By This User (
                        {data.blocking.usersBlocked.length})
                      </h4>
                      <div className="space-y-2">
                        {data.blocking.usersBlocked.map((user: BlockedUser) => (
                          <div
                            key={user.id}
                            className="border border-red-200 dark:border-red-800 rounded p-2 text-sm"
                          >
                            <p className="font-semibold text-black dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-[#C4C4C4]">{user.email}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.blocking.blockedByUsers.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-black dark:text-white mb-2">
                        Blocking This User (
                        {data.blocking.blockedByUsers.length})
                      </h4>
                      <div className="space-y-2">
                        {data.blocking.blockedByUsers.map(
                          (user: BlockedUser) => (
                            <div
                              key={user.id}
                              className="border border-red-200 dark:border-red-800 rounded p-2 text-sm"
                            >
                              <p className="font-semibold text-black dark:text-white">
                                {user.name}
                              </p>
                              <p className="text-[#C4C4C4]">{user.email}</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Shopping Tab */}
        <TabsContent value="shopping">
          <div className="space-y-4">
            {/* Cart */}
            {data.shopping.cart && (
              <Card>
                <CardHeader className="bg-blue-100 dark:bg-blue-900">
                  <CardTitle className="text-blue-800 dark:text-blue-100">
                    Active Cart
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Total Items</p>
                      <p className="text-2xl font-bold text-black dark:text-white">
                        {data.shopping.cart.totalItems}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#C4C4C4]">Cart Value</p>
                      <p className="text-2xl font-bold text-black dark:text-white">
                        ${data.shopping.cart.totalValue.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {data.shopping.cart.items.map((item: CartItem) => (
                      <div
                        key={item.merchandiseId}
                        className="border border-[#C4C4C4] rounded p-2 text-sm"
                      >
                        <p className="font-semibold text-black dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-[#C4C4C4]">
                          ${item.price} × {item.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Orders */}
            {data.shopping.orders.length > 0 && (
              <Card>
                <CardHeader className="bg-green-100 dark:bg-green-900">
                  <CardTitle className="text-green-800 dark:text-green-100">
                    Order History ({data.shopping.orders.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {data.shopping.orders.map((order: Order) => (
                      <div
                        key={order.id}
                        className="border border-green-200 dark:border-green-800 rounded p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-black dark:text-white">
                            Order #{order.id.slice(0, 8)}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#C4C4C4] mb-2">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-bold text-[#F3CFC6]">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                        <details className="mt-2">
                          <summary className="text-sm cursor-pointer text-[#C4C4C4] hover:text-white">
                            {order.items.length} items
                          </summary>
                          <div className="mt-2 space-y-1 text-xs">
                            {order.items.map((item: OrderItem, i: number) => (
                              <p key={i} className="text-[#C4C4C4]">
                                • {item.name} × {item.quantity} @ ${item.price}
                              </p>
                            ))}
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-4">
            {/* Reports About User */}
            {data.reports.reportsAboutThisUser.length > 0 && (
              <Card className="border-red-300 dark:border-red-600">
                <CardHeader className="bg-red-100 dark:bg-red-900">
                  <CardTitle className="text-red-800 dark:text-red-100">
                    Reports About This User (
                    {data.reports.reportsAboutThisUser.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {data.reports.reportsAboutThisUser.map((report: Report) => (
                      <div
                        key={report.id}
                        className="border border-red-200 dark:border-red-800 rounded p-3"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-black dark:text-white">
                            {report.reportedBy}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              report.status === "resolved"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#C4C4C4] mb-2">
                          {report.reportedByEmail}
                        </p>
                        <p className="font-semibold text-black dark:text-white mb-1">
                          {report.reason}
                        </p>
                        {report.details && (
                          <p className="text-sm text-[#C4C4C4]">
                            {report.details}
                          </p>
                        )}
                        <p className="text-xs text-[#C4C4C4] mt-2">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reports Made By User */}
            {data.reports.reportsSubmittedByUser.length > 0 && (
              <Card className="border-blue-300 dark:border-blue-600">
                <CardHeader className="bg-blue-100 dark:bg-blue-900">
                  <CardTitle className="text-blue-800 dark:text-blue-100">
                    Reports Made By User (
                    {data.reports.reportsSubmittedByUser.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {data.reports.reportsSubmittedByUser.map(
                      (report: Report) => (
                        <div
                          key={report.id}
                          className="border border-blue-200 dark:border-blue-800 rounded p-3"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-black dark:text-white">
                              {report.reportedUser ||
                                report.reportedProfessional}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                report.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {report.status}
                            </span>
                          </div>
                          <p className="font-semibold text-black dark:text-white mb-1">
                            {report.reason}
                          </p>
                          {report.details && (
                            <p className="text-sm text-[#C4C4C4]">
                              {report.details}
                            </p>
                          )}
                          <p className="text-xs text-[#C4C4C4] mt-2">
                            {new Date(report.createdAt).toLocaleString()}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.reports.reportsAboutThisUser.length === 0 &&
              data.reports.reportsSubmittedByUser.length === 0 && (
                <div className="text-center py-8 text-[#C4C4C4]">
                  No reports found
                </div>
              )}
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content">
          <div className="space-y-4">
            {/* Forum Activity */}
            {(data.content.posts.length > 0 ||
              data.content.replies.length > 0) && (
              <Card>
                <CardHeader className="bg-purple-100 dark:bg-purple-900">
                  <CardTitle className="text-purple-800 dark:text-purple-100">
                    Forum Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {data.content.posts.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-black dark:text-white mb-2">
                        Posts ({data.content.posts.length})
                      </h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {data.content.posts.map((post: Post) => (
                          <div
                            key={post.id}
                            className="border border-purple-200 dark:border-purple-800 rounded p-2 text-sm"
                          >
                            <p className="font-semibold text-black dark:text-white">
                              {post.title}
                            </p>
                            <p className="text-[#C4C4C4] truncate">
                              {post.content.substring(0, 100)}...
                            </p>
                            <p className="text-xs text-[#C4C4C4] mt-1">
                              {post.replyCount} replies •{" "}
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.content.replies.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-black dark:text-white mb-2">
                        Replies ({data.content.replies.length})
                      </h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {data.content.replies.map((reply: Reply) => (
                          <div
                            key={reply.id}
                            className="border border-purple-200 dark:border-purple-800 rounded p-2 text-sm"
                          >
                            <p className="text-[#C4C4C4] truncate">
                              {reply.content.substring(0, 100)}...
                            </p>
                            <p className="text-xs text-[#C4C4C4] mt-1">
                              {new Date(reply.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Training */}
            {data.training.videosWatched.length > 0 && (
              <Card>
                <CardHeader className="bg-orange-100 dark:bg-orange-900">
                  <CardTitle className="text-orange-800 dark:text-orange-100 flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Training Videos Watched (
                    {data.training.videosWatched.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {data.training.videosWatched.map((video: Video) => (
                      <div
                        key={video.id}
                        className="border border-orange-200 dark:border-orange-800 rounded p-2 text-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-black dark:text-white">
                              {video.videoName}
                            </p>
                            <p className="text-[#C4C4C4]">
                              {video.watchedSeconds}s watched
                            </p>
                          </div>
                          {video.isCompleted && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Security Logs */}
      {data.securityLogs.length > 0 && (
        <Card>
          <CardHeader className="bg-yellow-100 dark:bg-yellow-900">
            <CardTitle className="text-yellow-800 dark:text-yellow-100 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Security Logs ({data.securityLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.securityLogs.map((log: SecurityLog) => (
                <div
                  key={log.id}
                  className="border border-yellow-200 dark:border-yellow-800 rounded p-2 text-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-black dark:text-white">
                        {log.eventType}
                      </p>
                      <p className="text-[#C4C4C4] text-xs">{log.details}</p>
                      {log.ipAddress && (
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                          {log.ipAddress}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-[#C4C4C4]">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Notes */}
      {data.adminNotes.length > 0 && (
        <Card>
          <CardHeader className="bg-indigo-100 dark:bg-indigo-900">
            <CardTitle className="text-indigo-800 dark:text-indigo-100 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Admin Notes ({data.adminNotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.adminNotes.map((note: AdminNote) => (
                <div
                  key={note.id}
                  className="border border-indigo-200 dark:border-indigo-800 rounded p-3 bg-indigo-50 dark:bg-indigo-950"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-indigo-800 dark:text-indigo-100">
                      {note.author}
                    </p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-indigo-900 dark:text-indigo-100">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
