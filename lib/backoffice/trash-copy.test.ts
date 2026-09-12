import { describe, expect, it } from 'vitest';

import en from '@/messages/en.json';
import fr from '@/messages/fr.json';

/**
 * Deleting an annotation is a soft delete; only Purge is irreversible. The two
 * confirm dialogs live a page apart, so it is easy for the delete copy to go on
 * promising permanence after the action behind it stopped being permanent —
 * which is what happened when the trash landed. These pin both halves.
 */
describe('delete vs purge copy', () => {
  it('does not promise permanence when moving an annotation to the trash', () => {
    expect(en.backoffice.annotations.deleteDesc).not.toMatch(/permanent/i);
    expect(fr.backoffice.annotations.deleteDesc).not.toMatch(/définitiv/i);
  });

  it('does promise permanence when purging one', () => {
    expect(en.backoffice.trash.purgeDesc).toMatch(/permanent/i);
    expect(en.backoffice.trash.bulkPurgeDesc).toMatch(/permanent/i);
    expect(fr.backoffice.trash.purgeDesc).toMatch(/définitiv/i);
    expect(fr.backoffice.trash.bulkPurgeDesc).toMatch(/définitiv/i);
  });
});
