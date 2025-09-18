"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, FileText, Shield, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

interface Survey {
  id: string;
  rating: number;
  feedback?: string;
  createdAt: Date;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface SecurityLog {
  id: string;
  eventType: string;
  ipAddress?: string;
  details: string;
  timestamp: Date;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

interface UserReport {
  id: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: Date;
  reporter: { id: string; firstName: string; lastName: string; email: string };
  reportedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reportedSpecialist?: { id: string; name: string; location: string };
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ReportsPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("surveys");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [surveyRes, logRes, reportRes] = await Promise.all([
          fetch("/api/reports/surveys"),
          fetch("/api/reports/security-logs"),
          fetch("/api/reports/user-reports"),
        ]);
        if (!surveyRes.ok || !logRes.ok || !reportRes.ok)
          throw new Error("Fetch failed");
        setSurveys(await surveyRes.json());
        setLogs(await logRes.json());
        setReports(await reportRes.json());
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSurveys = surveys.filter((s) =>
    `${s.user.firstName} ${s.user.lastName} ${s.user.email} ${s.feedback}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter((l) =>
    `${l.eventType} ${l.details} ${l.user?.email || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredReports = reports.filter((r) =>
    `${r.reason} ${r.details} ${r.reporter.email} ${r.reportedUser?.email || ""} ${r.reportedSpecialist?.name || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-gradient-to-r from-[#F3CFC6] to-[#C4C4C4] text-black dark:text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <FileText className="mr-2 h-6 w-6" />
            Reports & Security
          </CardTitle>
          <p className="text-sm opacity-80">
            Manage feedback, security events, and user reports.
          </p>
        </CardHeader>
      </Card>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C4C4C4]" />
        <Input
          placeholder="Search surveys, logs, or reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-[#C4C4C4] focus:ring-[#F3CFC6] dark:bg-black dark:text-white dark:border-[#C4C4C4]"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F3CFC6]/20 dark:bg-[#C4C4C4]/20">
          {/* <TabsTrigger
            value="surveys"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
          >
            Feedback/Surveys
          </TabsTrigger> */}

          <TabsTrigger
            value="user-reports"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
          >
            User Reports
          </TabsTrigger>

          <TabsTrigger
            value="logs"
            className="data-[state=active]:bg-[#F3CFC6] data-[state=active]:text-black"
          >
            Security Logs
          </TabsTrigger>
        </TabsList>

        {/* <TabsContent value="surveys">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : (
                  <div className="divide-y divide-[#C4C4C4]">
                    <AnimatePresence>
                      {filteredSurveys.map((survey) => (
                        <motion.div
                          key={survey.id}
                          variants={itemVariants}
                          className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="font-semibold text-black dark:text-white">
                                {survey.user.firstName} {survey.user.lastName}
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                {survey.user.email} • Rating: {survey.rating}/5
                              </p>
                              <p className="text-sm text-black dark:text-white mt-1">
                                {survey.feedback}
                              </p>
                              <p className="text-xs text-[#C4C4C4] mt-1">
                                {new Date(
                                  survey.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent> */}

        <TabsContent value="user-reports">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : (
                  <div className="divide-y divide-[#C4C4C4]">
                    <AnimatePresence>
                      {filteredReports.map((report) => (
                        <motion.div
                          key={report.id}
                          variants={itemVariants}
                          className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="font-semibold text-black dark:text-white">
                                {report.reason}
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                Reporter: {report.reporter.firstName}{" "}
                                {report.reporter.lastName} (
                                {report.reporter.email})
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                Reported:{" "}
                                {report.reportedUser
                                  ? `${report.reportedUser.firstName} ${report.reportedUser.lastName} (${report.reportedUser.email})`
                                  : report.reportedSpecialist
                                    ? `${report.reportedSpecialist.name} (${report.reportedSpecialist.location})`
                                    : "Unknown"}
                              </p>
                              <p className="text-sm text-black dark:text-white mt-1">
                                {report.details}
                              </p>
                              <p className="text-xs text-[#C4C4C4] mt-1">
                                Status: {report.status} •{" "}
                                {new Date(report.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : (
                  <div className="divide-y divide-[#C4C4C4]">
                    <AnimatePresence>
                      {filteredLogs.map((log) => (
                        <motion.div
                          key={log.id}
                          variants={itemVariants}
                          className="p-4 hover:bg-[#F3CFC6]/10 dark:hover:bg-[#C4C4C4]/10 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <p className="font-semibold text-black dark:text-white">
                                {log.eventType.toUpperCase()}
                              </p>
                              <p className="text-sm text-[#C4C4C4]">
                                {log.user
                                  ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})`
                                  : "Anonymous"}
                              </p>
                              <p className="text-sm text-black dark:text-white mt-1">
                                {log.details}
                              </p>
                              {log.ipAddress && (
                                <p className="text-xs text-[#C4C4C4]">
                                  IP: {log.ipAddress}
                                </p>
                              )}
                              <p className="text-xs text-[#C4C4C4] mt-1">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
