/**
 * @publicApi
 */
export interface NaeuralNetworkGateway {
    afterInit?: (server: any) => void;
    handleConnection?: (...args: any[]) => void;
    handleDisconnect?: (client: any) => void;
    handleBooted?: (...args: any[]) => void;
    handleShutdown?: (...args: any[]) => void;
}
