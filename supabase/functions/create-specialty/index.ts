import { serve } from 'std/http/server.ts'
import { handleCreateSpecialty } from './handler.ts'

serve((req: Request) => handleCreateSpecialty(req))
