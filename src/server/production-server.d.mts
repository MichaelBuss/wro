import type { IncomingMessage, Server } from 'node:http'

export declare function staticPathCandidates(clientRoot: string, pathname: string): Array<string>

export declare function createFetchRequest(req: NodeRequest, defaultPort: number): Request

export declare function parsePort(raw: string | undefined): number | undefined

export declare function startProductionServer(options: {
  clientRoot?: string
  handler: { fetch: (request: Request) => Response | Promise<Response> }
  log?: Pick<Console, 'info'>
}): Promise<Server>

/** The subset of a Node `IncomingMessage` the request translation needs. */
type NodeRequest = Pick<IncomingMessage, 'headers' | 'method' | 'url'>
