import unittest
from services.field_extractor import FieldExtractor
from services.text_cleaner import TextCleaner
from models.extraction import PageOCRResult

class TestFieldExtraction(unittest.TestCase):
    def test_pan_extraction(self):
        text = "GOVERNMENT OF INDIA\nIncome Tax Department\nPermanent Account Number: ABCDE1234F\nName: ABC FOUNDATION"
        page = PageOCRResult(page=1, text=text, confidence=0.95, word_count=15)
        fields = FieldExtractor.extract_fields([page], "PAN_DOCUMENT")
        self.assertIn("pan", fields)
        self.assertEqual(fields["pan"].value, "ABCDE1234F")

    def test_registration_extraction(self):
        text = "REGISTRATION CERTIFICATE\nThis is to certify that ABC FOUNDATION\nRegistration No: REG12345\nDate: 12/04/2018"
        page = PageOCRResult(page=1, text=text, confidence=0.96, word_count=20)
        fields = FieldExtractor.extract_fields([page], "REGISTRATION_CERTIFICATE")
        self.assertIn("registration_number", fields)
        self.assertEqual(fields["registration_number"].value, "REG12345")
        self.assertIn("organization_name", fields)
        self.assertIn("ABC FOUNDATION", fields["organization_name"].value)

    def test_address_extraction(self):
        text = "CERTIFICATE OF REGISTRATION\nABC FOUNDATION\nRegistered Office Address: 101 Lotus Enclave, SG Highway, Ahmedabad, Gujarat 380015"
        page = PageOCRResult(page=1, text=text, confidence=0.92, word_count=18)
        fields = FieldExtractor.extract_fields([page], "ADDRESS_PROOF")
        self.assertIn("address", fields)
        self.assertIn("Ahmedabad", fields["address"].value)

if __name__ == "__main__":
    unittest.main()
