import Docker from 'dockerode';

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

export function getDockerClient() {
  return new Docker({ socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock' });
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
  const messages: Record<string, string> = {
    container_not_found: 'Container not found.',
    docker_unavailable: 'Docker daemon is unavailable.',
    permission_denied: 'PrivStack cannot access the Docker socket.',
    socket_missing: 'Docker socket is not mounted.',
  };

  return {
    error: errorCode,
    message: messages[errorCode],
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
