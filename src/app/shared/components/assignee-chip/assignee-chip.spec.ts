import { TestBed } from '@angular/core/testing';
import type { MessageAssignment } from '../../../core/api/types';
import { AssigneeChip } from './assignee-chip';

const assignment = (over: Partial<MessageAssignment> = {}): MessageAssignment => ({
  user_id: 'u-1',
  first_name: 'Laura',
  last_name: 'Valencia',
  email: 'laura@entidad.co',
  asignado_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  origen: 'automatica',
  asignado_por: null,
  ...over,
});

function render(inputs: Record<string, unknown>): HTMLElement {
  const fixture = TestBed.createComponent(AssigneeChip);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AssigneeChip', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AssigneeChip] }).compileComponents();
  });

  it('muestra "Sin asignar" sin asignación', () => {
    expect(render({ assignment: null }).textContent).toContain('Sin asignar');
  });

  it('muestra el nombre, las iniciales y hace cuánto se asignó', () => {
    const text = render({ assignment: assignment() }).textContent ?? '';
    expect(text).toContain('Laura Valencia');
    expect(text).toContain('LV');
    expect(text).toContain('hace 2 h');
  });

  it('sin nombre (vista del auxiliar) solo muestra la fecha', () => {
    const text = render({ assignment: assignment(), showName: false }).textContent ?? '';
    expect(text).not.toContain('Laura');
    expect(text).toContain('Asignado hace 2 h');
  });

  it('en una reasignación manual dice quién reasignó en el título', () => {
    const el = render({ assignment: assignment({ origen: 'manual', asignado_por: 'u-9' }), reassignedBy: 'Ana Ruiz' });
    expect(el.querySelector('[title]')?.getAttribute('title')).toContain('reasignado por Ana Ruiz');
  });

  it('usa el correo si no hay nombre', () => {
    const text = render({ assignment: assignment({ first_name: null, last_name: null }) }).textContent ?? '';
    expect(text).toContain('laura@entidad.co');
  });
});
