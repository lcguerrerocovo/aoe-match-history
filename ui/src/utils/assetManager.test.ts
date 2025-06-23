import { describe, it, expect } from 'vitest';
import { assetManager } from './assetManager';

describe('assetManager', () => {
  describe('getCivIcon', () => {
    it('should normalize civ names correctly', () => {
      const testCases = [
        { civName: 'Aztec', expected: 'aztecs.png' },
        { civName: 'Britons', expected: 'britons.png' },
        { civName: 'Byzantines', expected: 'byzantines.png' },
        { civName: 'Franks', expected: 'franks.png' },
        { civName: 'Goths', expected: 'goths.png' },
        { civName: 'Japanese', expected: 'japanese.png' },
        { civName: 'Mongols', expected: 'mongols.png' },
        { civName: 'Persians', expected: 'persians.png' },
        { civName: 'Saracens', expected: 'saracens.png' },
        { civName: 'Teutons', expected: 'teutons.png' },
        { civName: 'Turks', expected: 'turks.png' },
        { civName: 'Vikings', expected: 'vikings.png' },
        { civName: 'Chinese', expected: 'chinese.png' },
        { civName: 'Koreans', expected: 'koreans.png' },
        { civName: 'Spanish', expected: 'spanish.png' },
        { civName: 'Italians', expected: 'italians.png' },
        { civName: 'Huns', expected: 'huns.png' },
        { civName: 'Mayans', expected: 'mayans.png' },
        { civName: 'Incas', expected: 'incas.png' },
        { civName: 'Indians', expected: 'indians.png' },
        { civName: 'Ethiopians', expected: 'ethiopians.png' },
        { civName: 'Malians', expected: 'malians.png' },
        { civName: 'Berbers', expected: 'berbers.png' },
        { civName: 'Malay', expected: 'malay.png' },
        { civName: 'Burmese', expected: 'burmese.png' },
        { civName: 'Khmer', expected: 'khmer.png' },
        { civName: 'Vietnamese', expected: 'vietnamese.png' },
        { civName: 'Bulgarians', expected: 'bulgarians.png' },
        { civName: 'Tatars', expected: 'tatars.png' },
        { civName: 'Cumans', expected: 'cumans.png' },
        { civName: 'Lithuanians', expected: 'lithuanians.png' },
        { civName: 'Burgundians', expected: 'burgundians.png' },
        { civName: 'Sicilians', expected: 'sicilians.png' },
        { civName: 'Poles', expected: 'poles.png' },
        { civName: 'Bohemians', expected: 'bohemians.png' },
        { civName: 'Dravidians', expected: 'dravidians.png' },
        { civName: 'Bengalis', expected: 'bengalis.png' },
        { civName: 'Gurjaras', expected: 'gurjaras.png' },
        { civName: 'Romans', expected: 'romans.png' },
        { civName: 'Armenians', expected: 'armenians.png' },
        { civName: 'Georgians', expected: 'georgians.png' },
        { civName: 'Khitans', expected: 'khitans.png' },
        { civName: 'Jurchens', expected: 'jurchens.png' },
        { civName: 'Yamato', expected: 'yamato.png' },
        { civName: 'Spartans', expected: 'spartans.png' },
        { civName: 'Palmyran', expected: 'palmyran.png' },
        { civName: 'Minoan', expected: 'minoan.png' },
        { civName: 'Macedonian', expected: 'macedonian.png' },
        { civName: 'Lac Viet', expected: 'lacviet.png' },
        { civName: 'Choson', expected: 'choson.png' },
        { civName: 'Celts', expected: 'celts.png' },
        { civName: 'Slavs', expected: 'slavs.png' },
        { civName: 'Magyars', expected: 'magyars.png' },
        { civName: 'Portuguese', expected: 'portuguese.png' },
        { civName: 'Phoenician', expected: 'phoenician.png' },
        { civName: 'Sumerian', expected: 'sumerian.png' },
        { civName: 'Egyptian', expected: 'egyptian.png' },
        { civName: 'Greek', expected: 'greek.png' },
        { civName: 'Roman', expected: 'roman.png' },
        { civName: 'Persian', expected: 'persian.png' },
        { civName: 'Hittite', expected: 'hittite.png' },
        { civName: 'Assyrian', expected: 'assyrian.png' },
        { civName: 'Babylonian', expected: 'babylonian.png' },
        { civName: 'Carthaginian', expected: 'carthaginian.png' },
        { civName: 'Athenians', expected: 'athenians.png' },
        { civName: 'Achaemenids', expected: 'achaemenids.png' },
        { civName: 'Shang', expected: 'shang.png' },
        { civName: 'Wei', expected: 'wei.png' },
        { civName: 'Shu', expected: 'shu.png' },
        { civName: 'Wu', expected: 'wu.png' },
      ];

      testCases.forEach(({ civName, expected }) => {
        const url = assetManager.getCivIcon(civName);
        expect(url).toContain(`civ_icons/${expected}`);
      });
    });

    it('should handle unknown civ names gracefully', () => {
      const url = assetManager.getCivIcon('UnknownCiv');
      expect(url).toContain('civ_icons/unknownciv.png');
    });

    it('should handle empty civ names', () => {
      const url = assetManager.getCivIcon('');
      expect(url).toContain('civ_icons/.png');
    });
  });

  describe('getMapImage', () => {
    it('should resolve map names correctly', () => {
      const testCases = [
        { mapName: 'Arabia', expected: 'rm_arabia.png' },
        { mapName: 'BlackForest', expected: 'rm_black-forest.png' },
        { mapName: 'AmazonTunnel', expected: 'rm_amazon_tunnels.png' },
      ];

      testCases.forEach(({ mapName, expected }) => {
        const url = assetManager.getMapImage(mapName);
        expect(url).toContain(`maps/${expected}`);
      });
    });
  });

  describe('environment handling', () => {
    it('should use correct URL format', () => {
      const url = assetManager.getCivIcon('Aztecs');
      // Should contain either development or production URL pattern
      expect(url).toMatch(/^(https:\/\/aoe2\.site\/assets\/civ_icons\/aztecs\.png|\/src\/assets\/civ_icons\/aztecs\.png)$/);
    });
  });
}); 