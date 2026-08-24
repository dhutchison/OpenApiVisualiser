import {
  ALL_CALIBRATION_FIXTURES,
  assessCalibrationFixture,
  CALIBRATION_FAMILIES,
  CALIBRATION_GITHUB_ANCHORS,
  CALIBRATION_MODEL,
  CALIBRATION_REAL_ANCHORS,
  CALIBRATION_UBER_ANCHORS,
  serializeComplexityReport
} from './complexity-calibration';

describe('operation-contract-complexity/1.0.0 calibration corpus', () => {
  it('publishes every stable synthetic family and provenance-bearing fixture', () => {
    expect(CALIBRATION_FAMILIES.map(family => family.id)).toEqual([
      'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9'
    ]);
    expect(new Set(ALL_CALIBRATION_FIXTURES.map(fixture => fixture.id)).size).toBe(ALL_CALIBRATION_FIXTURES.length);
    ALL_CALIBRATION_FIXTURES.forEach(fixture => {
      expect(fixture.provenance.length).toBeGreaterThan(0);
      expect(fixture.document.openapi).toBe('3.1.0');
    });
  });

  it('keeps every synthetic fixture assessable through the public report boundary', () => {
    CALIBRATION_FAMILIES.forEach(family => family.fixtures.forEach(fixture => {
      const report = assessCalibrationFixture(fixture);
      expect(report.modelVersion).toBe(CALIBRATION_MODEL);
      expect(report.assessments).toHaveSize(1);
      expect(report.assessments[0].identity.path).toBe(fixture.path);
      expect(report.assessments[0].identity.method).toBe(fixture.method);
      expect(report.assessments[0].dimensions).toEqual(jasmine.objectContaining({
        interactionSurface: jasmine.anything(), dataShape: jasmine.anything(),
        conditionality: jasmine.anything(), indirection: jasmine.anything(),
        protocolObligations: jasmine.anything()
      }));
    }));
  });

  it('preserves the S0 one-variable burden relationship', () => {
    const reports = CALIBRATION_FAMILIES[0].fixtures.map(assessCalibrationFixture);
    expect(reports.map(report => report.assessments[0].dimensions.interactionSurface.units)).toEqual([1, 2, 2, 4]);
    expect(reports[0].assessments[0].finalBand).toBe('Low');
    expect(reports[3].assessments[0].finalBand).not.toBe('Low');
  });

  it('keeps S1 representations distinct at the interaction surface while deduplicating shared shape', () => {
    const shared = assessCalibrationFixture(CALIBRATION_FAMILIES[1].fixtures[4]).assessments[0];
    const distinct = assessCalibrationFixture(CALIBRATION_FAMILIES[1].fixtures[5]).assessments[0];
    expect(shared.dimensions.interactionSurface.units).toBe(distinct.dimensions.interactionSurface.units);
    expect(shared.dimensions.dataShape.units).toBeGreaterThan(0);
    expect(distinct.dimensions.dataShape.units).toBeGreaterThan(shared.dimensions.dataShape.units);
  });

  it('keeps S2 recursive shape finite and explicitly escalated', () => {
    const recursive = assessCalibrationFixture(CALIBRATION_FAMILIES[2].fixtures[3]).assessments[0];
    expect(recursive.confidence).toBe('Complete');
    expect(recursive.dimensions.dataShape.level).toBe('High');
    expect(recursive.reasons.filter(reason => reason.code === 'recursive-structure')).toHaveSize(1);
    expect(recursive.reasons.filter(reason => reason.code === 'cycle-navigation')).toHaveSize(1);
  });

  it('keeps S4 equivalent shape stable while exposing indirection', () => {
    const inline = assessCalibrationFixture(CALIBRATION_FAMILIES[4].fixtures[0]).assessments[0];
    const reference = assessCalibrationFixture(CALIBRATION_FAMILIES[4].fixtures[1]).assessments[0];
    expect(reference.dimensions.dataShape.units).toBe(inline.dimensions.dataShape.units);
    expect(reference.dimensions.indirection.units).toBeGreaterThan(inline.dimensions.indirection.units);
  });

  it('keeps S6 support coverage separate from structural burden', () => {
    const none = assessCalibrationFixture(CALIBRATION_FAMILIES[6].fixtures[0]).assessments[0];
    const described = assessCalibrationFixture(CALIBRATION_FAMILIES[6].fixtures[1]).assessments[0];
    const strong = assessCalibrationFixture(CALIBRATION_FAMILIES[6].fixtures[2]).assessments[0];
    const duplicate = assessCalibrationFixture(CALIBRATION_FAMILIES[6].fixtures[3]).assessments[0];
    expect(none.documentationSupport.level).toBe('None');
    expect(described.documentationSupport.level).toBe('Partial');
    expect(strong.documentationSupport.level).toBe('Strong');
    expect(duplicate.documentationSupport.level).not.toBe('Strong');
    expect(strong.documentationSupport.mitigation).toBeDefined();
    expect(strong.dimensions.dataShape.units).toBe(none.dimensions.dataShape.units);
  });

  it('keeps S7 missing or unsupported semantics incomplete and unknown', () => {
    const complete = assessCalibrationFixture(CALIBRATION_FAMILIES[7].fixtures[0]).assessments[0];
    const incomplete = CALIBRATION_FAMILIES[7].fixtures.slice(1).map(assessCalibrationFixture)
      .map(report => report.assessments[0]);
    expect(complete.confidence).toBe('Complete');
    incomplete.forEach((assessment, index) => {
      const id = CALIBRATION_FAMILIES[7].fixtures[index + 1].id;
      expect(assessment.confidence).withContext(id).toBe('Incomplete');
      expect(assessment.finalBand).withContext(id).toBe('Unknown');
      expect(assessment.rawBand).withContext(id).toBe('Unknown');
    });
  });

  it('keeps S8 same-role reuse distinct from request/response role identity', () => {
    const responseReuse = assessCalibrationFixture(CALIBRATION_FAMILIES[8].fixtures[0]).assessments[0];
    const requestResponse = assessCalibrationFixture(CALIBRATION_FAMILIES[8].fixtures[1]).assessments[0];
    expect(requestResponse.dimensions.dataShape.units).toBeGreaterThan(responseReuse.dimensions.dataShape.units);
    expect(responseReuse.reasons.filter(reason => reason.code === 'field')).toHaveSize(2);
    expect(requestResponse.reasons.filter(reason => reason.code === 'field')).toHaveSize(4);
  });

  it('keeps S9 cross-dimension cases incomparable until the all-high anchor', () => {
    const broad = assessCalibrationFixture(CALIBRATION_FAMILIES[9].fixtures[0]).assessments[0];
    const deep = assessCalibrationFixture(CALIBRATION_FAMILIES[9].fixtures[1]).assessments[0];
    const allHigh = assessCalibrationFixture(CALIBRATION_FAMILIES[9].fixtures[3]).assessments[0];
    const supported = assessCalibrationFixture(CALIBRATION_FAMILIES[9].fixtures[4]).assessments[0];
    expect(broad.confidence).toBe('Complete');
    expect(deep.confidence).toBe('Complete');
    expect(allHigh.rawBand).toBe('Very high');
    expect(allHigh.finalBand).toBe('Very high');
    expect(supported.rawBand).toBe('Very high');
    expect(supported.finalBand).toBe('High');
  });

  it('preserves the settled real-anchor raw ordering', () => {
    const byId = new Map([...CALIBRATION_REAL_ANCHORS, ...CALIBRATION_UBER_ANCHORS].map(fixture => [
      fixture.id, assessCalibrationFixture(fixture).assessments[0]
    ]));
    const interaction = (id: string) => byId.get(id)!.dimensions.interactionSurface.units;
    expect(interaction('R1')).toBeLessThan(interaction('R2'));
    expect(interaction('R2')).toBeLessThan(interaction('R5'));
    expect(interaction('R5')).toBeLessThan(interaction('R8'));
    expect(byId.get('R9')?.confidence).toBe('Qualified');
    expect(byId.get('R9')?.warnings.some(warning => warning.code === 'prose-defined-language')).toBeTrue();
    expect(interaction('U1')).toBeLessThan(interaction('U2'));
    expect(interaction('U2')).toBeLessThan(interaction('U3'));
  });

  it('keeps GitHub anchors partial-orderable and x-multi-segment explicitly incomplete', () => {
    const assessments = new Map(CALIBRATION_GITHUB_ANCHORS.map(fixture => [fixture.id, assessCalibrationFixture(fixture).assessments[0]]));
    const interaction = (id: string) => assessments.get(id)!.dimensions.interactionSurface.units;
    expect(interaction('G1')).toBeLessThan(interaction('G3'));
    expect(interaction('G3')).toBeLessThan(interaction('G4'));
    expect(assessments.get('G5')?.confidence).toBe('Incomplete');
    expect(assessments.get('G5')?.finalBand).toBe('Unknown');
    expect(assessments.get('G5')?.blockingFaults.some(fault => fault.code === 'known-contract-affecting-extension')).toBeTrue();
  });

  it('serializes equivalent reports byte-for-byte', () => {
    const first = assessCalibrationFixture(CALIBRATION_REAL_ANCHORS[0]);
    const second = assessCalibrationFixture({...CALIBRATION_REAL_ANCHORS[0], document: {
      ...CALIBRATION_REAL_ANCHORS[0].document,
      paths: Object.fromEntries(Object.entries(CALIBRATION_REAL_ANCHORS[0].document.paths).reverse())
    }});
    expect(serializeComplexityReport(first)).toBe(serializeComplexityReport(second));
  });
});
