import { serve } from 'std/http/server.ts'
import { handleCreateAdmin } from './handler.ts'

serve(handleCreateAdmin)
