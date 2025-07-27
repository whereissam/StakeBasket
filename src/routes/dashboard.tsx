import { createFileRoute } from '@tanstack/react-router'
import { DashboardV3 } from '../components/DashboardV3'

export const Route = createFileRoute('/dashboard')({
  component: DashboardV3,
})