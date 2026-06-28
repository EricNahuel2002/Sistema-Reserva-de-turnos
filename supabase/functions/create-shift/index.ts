import { serve } from 'std/http/server.ts'
import { handleCreateShift } from './handler.ts'

serve((req: Request) => handleCreateShift(req))
