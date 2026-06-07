import Docker from 'dockerode';

export interface DockerConnectionInfo {
  mode: 'host' | 'socket';
  target: string;
}

export interface DockerContainerSummary {
  id: string;
  fullId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string | null;
  uptime: string;
  ports: string[];
  labels: Record<string, string>;
}

export function getDockerConnectionInfo(): DockerConnectionInfo {
  const dockerHost = process.env.DOCKER_HOST;
  if (dockerHost) {
    return { mode: 'host', target: dockerHost };
  }

  return {
    mode: 'socket',
    target: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
  };
}

export function getDockerClient() {
  const connection = getDockerConnectionInfo();

  if (connection.mode === 'host') {
    const url = new URL(connection.target);
    return new Docker({
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      host: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
    });
  }

  return new Docker({ socketPath: connection.target });
}

export function dockerErrorCode(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code) : '';
  const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number((error as any).statusCode) : 0;

  if (statusCode === 404) return 'container_not_found';
  if (code === 'EACCES' || code === 'EPERM') return 'permission_denied';
  if (code === 'ENOENT') return 'socket_missing';
  return 'docker_unavailable';
}

export function formatDockerError(error: unknown) {
  const errorCode = dockerErrorCode(error);
  const connection = getDockerConnectionInfo();
  const messages: Record<string, string> = {
    container_not_found: 'Container not found.',
    docker_unavailable: 'Docker daemon is unavailable.',
    permission_denied: 'PrivStack cannot access the Docker socket.',
    socket_missing: 'Docker socket is not mounted.',
  };
  const hints: Record<string, string> = {
    container_not_found: 'Refresh the widget and try the action again.',
    docker_unavailable: connection.mode === 'host'
      ? 'Check that the Docker socket proxy container is running and reachable from PrivStack.'
      : 'Check that Docker is running and the socket path is correct.',
    permission_denied: connection.mode === 'host'
      ? 'Check the Docker socket proxy permissions and mounted host socket.'
      : 'Use the Docker socket proxy deployment or grant the container access to the host Docker group.',
    socket_missing: 'Mount /var/run/docker.sock into the Docker socket proxy service.',
  };

  return {
    error: errorCode,
    message: messages[errorCode],
    hint: hints[errorCode],
    dockerAccess: connection.mode,
    dockerTarget: connection.target,
  };
}

function formatPorts(ports: any[] | undefined) {
  if (!Array.isArray(ports)) return [];

  return ports.map((port) => {
    const privatePort = port.PrivatePort ? `${port.PrivatePort}/${port.Type || 'tcp'}` : '';
    const publicPort = port.PublicPort ? `${port.IP || '0.0.0.0'}:${port.PublicPort}` : '';
    return publicPort ? `${publicPort}->${privatePort}` : privatePort;
  }).filter(Boolean);
}

function formatUptime(container: any) {
  if (container.State !== 'running') return container.Status || container.State;

  const status = String(container.Status || '');
  const match = status.match(/Up\s+(.+)/i);
  return match?.[1] || status || 'running';
}

export function normalizeContainer(container: any): DockerContainerSummary {
  const fullId = String(container.Id || '');

  return {
    id: fullId.substring(0, 12),
    fullId,
    name: container.Names?.[0]?.replace(/^\//, '') || 'unknown',
    image: container.Image || 'unknown',
    state: container.State || 'unknown',
    status: container.Status || container.State || 'unknown',
    createdAt: container.Created ? new Date(container.Created * 1000).toISOString() : null,
    uptime: formatUptime(container),
    ports: formatPorts(container.Ports),
    labels: container.Labels || {},
  };
}
