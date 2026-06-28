import { serve } from 'std/http/server.ts'
import { handleCreateClient } from './handler.ts'

serve((req: Request) => handleCreateClient(req))
