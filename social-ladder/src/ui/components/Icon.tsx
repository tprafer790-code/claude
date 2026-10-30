import type { IconId } from '../../data/types';
import { iconUrl } from '../../render/icons';

export function Icon({ id, size = 30, className = '', dim = false }: { id: IconId; size?: number; className?: string; dim?: boolean }) {
  return <img className={`px-icon ${dim ? 'dim' : ''} ${className}`} src={iconUrl(id, 3)} width={size} height={size} alt="" draggable={false} />;
}
