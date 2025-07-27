import { createFileRoute } from '@tanstack/react-router'
import { ContractsInfo } from '../components/ContractsInfo'

export const Route = createFileRoute('/contracts')({
  component: ContractsInfo,
})