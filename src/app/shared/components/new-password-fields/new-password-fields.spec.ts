import { TestBed } from '@angular/core/testing';
import { NewPasswordFields } from './new-password-fields';

describe('NewPasswordFields', () => {
  function setup(email = 'laura@entidad.co') {
    const fixture = TestBed.createComponent(NewPasswordFields);
    fixture.componentRef.setInput('email', email);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    const emitted: Array<string | null> = [];
    cmp.valueChange.subscribe((v) => emitted.push(v));
    const type = async (pwd: string, confirm = pwd) => {
      cmp.password.setValue(pwd);
      cmp.confirm.setValue(confirm);
      await Promise.resolve();
      fixture.detectChanges();
    };
    const ok = (id: string) => cmp.rules().find((r) => r.id === id)!.ok;
    return { cmp, emitted, type, ok };
  }

  it('acepta una contraseña que cumple la política del backend', async () => {
    const { emitted, type } = setup();
    await type('tutela-2026-segura');
    expect(emitted.at(-1)).toBe('tutela-2026-segura');
  });

  it('rechaza corta, poco variada, igual al correo o sin confirmar', async () => {
    const { emitted, type, ok } = setup('laura.valencia@entidad.co');
    await type('corta');
    expect(ok('len')).toBe(false);
    await type('aaaaaaaaaaaaaa');
    expect(ok('variety')).toBe(false);
    await type('laura.valencia');
    expect(ok('mail')).toBe(false);
    await type('tutela-2026-segura', 'otra-cosa-distinta');
    expect(emitted.at(-1)).toBeNull();
  });
});
