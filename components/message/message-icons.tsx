import {
  AlertTriangle,
  Archive,
  BarChart,
  Box,
  Calendar,
  FileText,
  Globe,
  HardDrive,
  Inbox,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  Mail,
  MessageSquare,
  Milestone,
  MonitorSmartphone,
  Phone,
  PlayCircle,
  Shield,
  Smartphone,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react"

import { MessageSource } from "@/types/message"

export function getServiceIcon(service: string | undefined): LucideIcon {
  if (!service) return Box

  const s = service.toLowerCase()
  if (s.includes("exchange")) return Mail
  if (s.includes("sharepoint") || s.includes("onedrive")) return HardDrive
  if (s.includes("teams")) return Users
  if (s.includes("entra") || s.includes("azure active directory") || s.includes("identity")) return Shield
  if (s.includes("intune") || s.includes("endpoint")) return Smartphone
  if (s.includes("defender") || s.includes("security") || s.includes("purview") || s.includes("compliance")) return Lock
  if (s.includes("apps") || s.includes("office") || s.includes("word") || s.includes("excel") || s.includes("powerpoint")) return FileText
  if (s.includes("power bi") || s.includes("power platform")) return BarChart
  if (s.includes("admin center") || s.includes("portal")) return LayoutDashboard
  if (s.includes("windows")) return MonitorSmartphone
  if (s.includes("viva")) return Globe
  if (s.includes("stream") || s.includes("video")) return Video
  if (s.includes("voice") || s.includes("phone") || s.includes("calling")) return Phone

  return Box
}

export function getCategoryIcon(category: string | undefined): LucideIcon {
  if (!category) return Layers

  const c = category.toLowerCase()
  if (c.includes("stay informed")) return Info
  if (c.includes("plan for change")) return Calendar
  if (c.includes("prevent or fix issues")) return AlertTriangle
  if (c.includes("new feature")) return PlayCircle
  if (c.includes("retirement")) return Archive
  
  return Layers
}

export function getSourceIcon(source: MessageSource | string | undefined): LucideIcon {
  if (source === MessageSource.Roadmap || source === "roadmap") return Milestone
  if (source === MessageSource.MessageCenter || source === "messageCenter") return Inbox
  return MessageSquare
}
