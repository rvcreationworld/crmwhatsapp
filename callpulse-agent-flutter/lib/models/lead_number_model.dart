class LeadNumberModel {
  final String leadType;
  final int leadId;
  final String leadName;
  final String leadContact;
  final String contactLast10;

  LeadNumberModel({
    required this.leadType,
    required this.leadId,
    required this.leadName,
    required this.leadContact,
    required this.contactLast10,
  });

  factory LeadNumberModel.fromJson(Map<String, dynamic> json) {
    return LeadNumberModel(
      leadType: (json['lead_type'] ?? json['leadType'])?.toString() ?? 'UNKNOWN',
      leadId: int.tryParse((json['lead_id'] ?? json['leadId'])?.toString() ?? '') ?? 0,
      leadName: (json['lead_name'] ?? json['leadName'])?.toString() ?? '',
      leadContact: (json['lead_contact'] ?? json['leadContact'])?.toString() ?? '',
      contactLast10: (json['contact_last10'] ?? json['contactLast10'])?.toString() ?? '',
    );
  }
}
