import { serve } from 'std/http/server.ts'
import { handleAssignShift } from './handler.ts'

serve((req: Request) => handleAssignShift(req))
