import { serve } from 'std/http/server.ts'
import { handleCancelShift } from './handler.ts'

serve((req: Request) => handleCancelShift(req))
