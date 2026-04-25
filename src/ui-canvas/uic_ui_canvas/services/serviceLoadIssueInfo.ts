export async function serviceLoadIssueInfo(projectId: string, input: Record<string, unknown>) {
  if (!projectId) {
    return {
      data: [],
      total: 0,
      bugCount: 0,
      sh: 0,
      eh: 0,
      totalIds: [],
      typeCounts: {},
    };
  }

  return {
    data: [],
    total: 0,
    bugCount: 0,
    sh: 0,
    eh: 0,
    totalIds: [],
    typeCounts: {},
  };
}
